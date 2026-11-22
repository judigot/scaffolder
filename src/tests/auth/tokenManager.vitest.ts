import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ApiError,
  isInteractiveLoginRequired,
  SessionExpiredError,
} from '@/lib/auth/authErrors.ts';
import { getAuthDiagnostics } from '@/lib/auth/authDiagnostics.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';
import { getAccessToken, revalidateSession } from '@/lib/auth/tokenManager.ts';
import { useUserStore } from '@/useUserStore.ts';
import { installRotatingTokenProvider, resetAuthState } from './testUtils.ts';

describe('tokenManager', () => {
  beforeEach(resetAuthState);
  afterEach(resetAuthState);

  it('returns a valid token and marks the session active (valid session after idle)', async () => {
    const { provider } = installRotatingTokenProvider();

    await expect(getAccessToken()).resolves.toBe('token-1');
    expect(provider).toHaveBeenCalledWith({});
    expect(useSessionStore.getState().status).toBe('active');
    expect(useUserStore.getState().accessToken).toBe('token-1');
    // Returning to an idle tab revalidates without user interaction.
    await expect(revalidateSession()).resolves.toBe(true);
  });

  it('renews an expired access token silently with cacheMode off when forced', async () => {
    const { provider } = installRotatingTokenProvider();
    await getAccessToken();
    await expect(getAccessToken({ forceRefresh: true })).resolves.toBe(
      'token-2',
    );
    expect(provider).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(useUserStore.getState().accessToken).toBe('token-2');
  });

  it('deduplicates concurrent token requests into one renewal', async () => {
    const { provider } = installRotatingTokenProvider();
    const tokens = await Promise.all([
      getAccessToken(),
      getAccessToken(),
      getAccessToken(),
      getAccessToken({ forceRefresh: true }),
      getAccessToken({ forceRefresh: true }),
    ]);
    // One normal + one forced request in flight at most.
    expect(provider).toHaveBeenCalledTimes(2);
    expect(new Set(tokens.slice(0, 3)).size).toBe(1);
    expect(tokens[3]).toBe(tokens[4]);
  });

  it.each([
    'login_required',
    'missing_refresh_token',
    'invalid_grant',
    'consent_required',
  ])(
    'treats %s (expired/revoked refresh token) as session expiry',
    async (code) => {
      const { failWith } = installRotatingTokenProvider();
      failWith(code);
      await expect(getAccessToken()).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
      expect(useSessionStore.getState().status).toBe('expired');
      expect(useSessionStore.getState().expiredReason).toBe(code);
      expect(useUserStore.getState().accessToken).toBeNull();
    },
  );

  it('blocks further protected calls without contacting Auth0 once expired', async () => {
    const { provider, failWith } = installRotatingTokenProvider();
    failWith('login_required');
    await expect(getAccessToken()).rejects.toBeInstanceOf(SessionExpiredError);
    provider.mockClear();
    failWith(null);

    await expect(getAccessToken()).rejects.toBeInstanceOf(SessionExpiredError);
    await expect(revalidateSession()).resolves.toBe(false);
    expect(provider).not.toHaveBeenCalled();
  });

  it('keeps the session on transient failures and flags recovery', async () => {
    const { failWith } = installRotatingTokenProvider();
    failWith('timeout');
    const error: unknown = await getAccessToken().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(SessionExpiredError);
    expect(useSessionStore.getState().status).toBe('active');
    expect(useSessionStore.getState().recoveryPending).toBe(true);

    failWith(null);
    await getAccessToken();
    expect(useSessionStore.getState().recoveryPending).toBe(false);
    expect(useSessionStore.getState().recoveredAt).not.toBeNull();
  });

  it('never records tokens in diagnostics', async () => {
    installRotatingTokenProvider();
    await getAccessToken();
    await getAccessToken({ forceRefresh: true });
    const serialized = JSON.stringify(getAuthDiagnostics());
    expect(serialized).not.toContain('token-1');
    expect(serialized).not.toContain('token-2');
    expect(serialized).toContain('token.refresh.success');
  });

  it('classifies Auth0 errors', () => {
    expect(isInteractiveLoginRequired({ error: 'login_required' })).toBe(true);
    expect(isInteractiveLoginRequired({ error: 'timeout' })).toBe(false);
    expect(
      isInteractiveLoginRequired(
        new Error('Missing Refresh Token (audience: x)'),
      ),
    ).toBe(true);
    expect(isInteractiveLoginRequired(new TypeError('Failed to fetch'))).toBe(
      false,
    );
  });
});
