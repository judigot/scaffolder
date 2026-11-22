import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authFetch,
  authFetchJson,
  authorizedFetch,
} from '@/lib/api/authFetch.ts';
import { ApiError, SessionExpiredError } from '@/lib/auth/authErrors.ts';
import { getAuthDiagnostics } from '@/lib/auth/authDiagnostics.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';
import {
  configureTokenProvider,
  type TokenProvider,
} from '@/lib/auth/tokenManager.ts';
import {
  getAuthHeader,
  installRotatingTokenProvider,
  jsonResponse,
  resetAuthState,
  setNavigatorOnline,
  requestUrl,
} from './testUtils.ts';

const fetchMock = vi.fn<typeof fetch>();

const catchError = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => {
      throw new Error('expected rejection');
    },
    (error: unknown) => error,
  );

describe('authFetch', () => {
  beforeEach(() => {
    resetAuthState();
    setNavigatorOnline(true);
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setNavigatorOnline(true);
    resetAuthState();
  });

  it('retrieves a fresh token immediately before every request', async () => {
    const { provider } = installRotatingTokenProvider();
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await authFetch('/user-metadata');
    await authFetch('/user-metadata');

    expect(provider).toHaveBeenCalledTimes(2);
    expect(getAuthHeader(fetchMock.mock.calls[0][1])).toBe('Bearer token-1');
    expect(getAuthHeader(fetchMock.mock.calls[1][1])).toBe('Bearer token-2');
    expect(requestUrl(fetchMock.mock.calls[0][0])).toMatch(
      /\/api\/user-metadata$/,
    );
  });

  it('on 401 renews the token silently and replays idempotent requests once', async () => {
    installRotatingTokenProvider();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Invalid token' }))
      .mockResolvedValueOnce(jsonResponse(200, { metadata: { a: 1 } }));

    const data = await authFetchJson('/user-metadata');

    expect(data).toEqual({ metadata: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getAuthHeader(fetchMock.mock.calls[1][1])).toBe('Bearer token-2');
    expect(useSessionStore.getState().status).toBe('active');
  });

  it('never replays a non-idempotent request after a 401', async () => {
    const { provider } = installRotatingTokenProvider();
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Invalid token' }));

    const error = await catchError(
      authFetch('/terraform/run', {
        method: 'POST',
        json: { enableEc2: false },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'unauthorized', status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Token was refreshed so the user's manual retry will succeed.
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('surfaces session expiry when the refresh token is revoked', async () => {
    const { failWith } = installRotatingTokenProvider();
    fetchMock.mockImplementation(() => {
      // The access token was rejected and the refresh token is now revoked.
      failWith('invalid_grant');
      return Promise.resolve(jsonResponse(401, { error: 'Invalid token' }));
    });

    const error = await catchError(authFetch('/user-metadata'));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(error).toBeInstanceOf(SessionExpiredError);
    expect(useSessionStore.getState().status).toBe('expired');
  });

  it('does not send infrastructure mutations while the session is expired', async () => {
    const { failWith } = installRotatingTokenProvider();
    failWith('login_required');

    const error = await catchError(
      authFetch('/terraform/run', {
        method: 'POST',
        json: { enableEc2: false },
      }),
    );

    expect(error).toBeInstanceOf(SessionExpiredError);
    expect(fetchMock).not.toHaveBeenCalled();

    // Even after Auth0 would succeed again, the gate stays closed until an
    // interactive sign-in reloads the app; nothing is replayed.
    failWith(null);
    await expect(
      authFetch('/terraform/workspace/x', { method: 'DELETE' }),
    ).rejects.toBeInstanceOf(SessionExpiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps 403 to a permission error without refreshing or replaying', async () => {
    const { provider } = installRotatingTokenProvider();
    fetchMock.mockResolvedValue(
      jsonResponse(403, {
        error: 'Failed',
        message: 'Terraform token lacks permission',
      }),
    );

    const error = await catchError(
      authFetch('/terraform/workspaces', { method: 'POST', idempotent: true }),
    );

    expect(error).toMatchObject({
      kind: 'forbidden',
      status: 403,
      message: 'Terraform token lacks permission',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('active');
  });

  it('maps server errors and network failures to transient errors', async () => {
    installRotatingTokenProvider();
    fetchMock.mockResolvedValueOnce(jsonResponse(500, {}));
    const serverError = await catchError(
      authFetch('/user-metadata', { errorMessage: 'Could not load settings.' }),
    );
    expect(serverError).toMatchObject({
      kind: 'server',
      message: 'Could not load settings.',
    });
    expect(serverError instanceof ApiError && serverError.isTransient).toBe(
      true,
    );

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const networkError = await catchError(authFetch('/user-metadata'));
    expect(networkError).toMatchObject({ kind: 'network' });
  });

  it('fails fast while offline without calling the API', async () => {
    installRotatingTokenProvider();
    setNavigatorOnline(false);
    const error = await catchError(authFetch('/user-metadata'));
    expect(error).toMatchObject({ kind: 'offline' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shares one token renewal across concurrent 401 responses', async () => {
    const provider = vi.fn<TokenProvider>(async ({ forceRefresh }) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return forceRefresh === true ? 'fresh-token' : 'stale-token';
    });
    configureTokenProvider(provider);
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        getAuthHeader(init) === 'Bearer fresh-token'
          ? jsonResponse(200, { ok: true })
          : jsonResponse(401, {}),
      ),
    );

    const results = await Promise.all(
      Array.from({ length: 5 }, () => authFetchJson('/user-metadata')),
    );

    expect(results).toEqual(Array.from({ length: 5 }, () => ({ ok: true })));
    // One shared normal request and one shared forced refresh for 5 requests.
    expect(provider).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('wraps invalid JSON and schema failures as invalid-response', async () => {
    installRotatingTokenProvider();
    fetchMock.mockResolvedValueOnce(new Response('not json', { status: 200 }));
    await expect(authFetchJson('/user-metadata')).rejects.toMatchObject({
      kind: 'invalid-response',
    });

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { a: 1 }));
    await expect(
      authFetchJson('/user-metadata', {}, () => {
        throw new Error('schema');
      }),
    ).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('authorizedFetch returns raw responses and renews on 401 without replay', async () => {
    const { provider } = installRotatingTokenProvider();
    fetchMock.mockResolvedValue(jsonResponse(401, {}));

    const response = await authorizedFetch('/github-token', { method: 'POST' });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(provider).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps tokens out of diagnostics for failed requests', async () => {
    installRotatingTokenProvider();
    fetchMock.mockResolvedValue(jsonResponse(401, {}));
    await catchError(authFetch('/terraform/run', { method: 'POST' }));
    const serialized = JSON.stringify(getAuthDiagnostics());
    expect(serialized).toContain('request.unauthorized');
    expect(serialized).not.toMatch(/token-\d/);
    expect(serialized).not.toMatch(/Bearer/);
  });
});
