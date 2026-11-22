import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDecryptedUserMetadata } from '@/hooks/useDecryptedUserMetadata.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createAppQueryClient } from '@/lib/api/queryClient.ts';
import { isSessionExpiredError } from '@/lib/auth/authErrors.ts';
import { useUserStore } from '@/useUserStore.ts';
import {
  installRotatingTokenProvider,
  jsonResponse,
  resetAuthState,
  setNavigatorOnline,
  requestUrl,
} from './testUtils.ts';

// Auth0 returns referentially stable values between renders.
const auth0State = vi.hoisted(() => ({
  user: { sub: 'auth0|alice' },
  isAuthenticated: true,
  isLoading: false,
  error: undefined,
  logout: () => undefined,
}));

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => auth0State,
}));

const fetchMock = vi.fn<typeof fetch>();

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createAppQueryClient()}>
    {children}
  </QueryClientProvider>
);

const respond = (handlers: Record<string, () => Response>) => {
  fetchMock.mockImplementation((input) => {
    const url = requestUrl(input);
    const match = Object.keys(handlers).find((suffix) => url.endsWith(suffix));
    return Promise.resolve(
      match === undefined ? jsonResponse(404, {}) : handlers[match](),
    );
  });
};

describe('useUser authentication-aware metadata', () => {
  beforeEach(() => {
    resetAuthState();
    setNavigatorOnline(true);
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetAuthState();
  });

  it('recovers from a 401 by renewing the token and replaying the read', async () => {
    installRotatingTokenProvider();
    let metadataCalls = 0;
    respond({
      '/user-metadata': () => {
        metadataCalls += 1;
        return metadataCalls === 1
          ? jsonResponse(401, { error: 'Invalid token' })
          : jsonResponse(200, {
              success: true,
              metadata: { infra: { tfcOrg: 'org' } },
            });
      },
      '/github-token': () => jsonResponse(200, { success: true, token: null }),
    });

    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.userMetadata).toEqual({ infra: { tfcOrg: 'org' } });
    });
    expect(result.current.metadataError).toBeNull();
    // Reactive token: consumers see the renewed token.
    expect(result.current.accessToken).toBe(
      useUserStore.getState().accessToken,
    );
  });

  it('reports a 401 with an unrecoverable session as an auth error, not as missing data', async () => {
    const { failWith } = installRotatingTokenProvider();
    respond({
      '/user-metadata': () => {
        failWith('login_required');
        return jsonResponse(401, { error: 'Invalid token' });
      },
      '/github-token': () => jsonResponse(401, {}),
    });

    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.metadataError).not.toBeNull();
    });
    expect(isSessionExpiredError(result.current.metadataError)).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('treats a successful empty metadata response as an empty state, not loading', async () => {
    installRotatingTokenProvider();
    respond({
      '/user-metadata': () =>
        jsonResponse(200, { success: true, metadata: null }),
      '/github-token': () => jsonResponse(200, { success: true, token: null }),
    });

    const { result } = renderHook(() => useDecryptedUserMetadata(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.decryptedMetadata).toEqual({});
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
