import { vi } from 'vitest';
import { clearAuthDiagnostics } from '@/lib/auth/authDiagnostics.ts';
import {
  clearLoginAttempts,
  clearReturnContext,
} from '@/lib/auth/returnContext.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';
import {
  configureTokenProvider,
  resetTokenManager,
  type TokenProvider,
} from '@/lib/auth/tokenManager.ts';
import { useUserStore } from '@/useUserStore.ts';

/** Error shaped like Auth0 SPA SDK errors (`error` holds the OAuth code). */
export class FakeAuth0Error extends Error {
  readonly error: string;

  constructor(code: string) {
    super(`auth0: ${code}`);
    this.error = code;
  }
}

export const resetAuthState = (): void => {
  resetTokenManager();
  useSessionStore.getState().reset();
  useSessionStore.setState({ isOnline: true });
  useUserStore.getState().clearUserData();
  clearAuthDiagnostics();
  clearLoginAttempts();
  clearReturnContext();
  window.sessionStorage.clear();
};

/**
 * Installs a token provider that hands out rotating tokens (token-1, token-2,
 * ...) and records how often Auth0 was asked for a token.
 */
export const installRotatingTokenProvider = (): {
  provider: ReturnType<typeof vi.fn<TokenProvider>>;
  failWith: (code: string | null) => void;
} => {
  let counter = 0;
  let failure: string | null = null;
  const provider = vi.fn<TokenProvider>(async () => {
    await Promise.resolve();
    if (failure !== null) {
      throw new FakeAuth0Error(failure);
    }
    counter += 1;
    return `token-${String(counter)}`;
  });
  configureTokenProvider(provider);
  return {
    provider,
    failWith: (code) => {
      failure = code;
    },
  };
};

export const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const getAuthHeader = (init: RequestInit | undefined): string | null => {
  const headers = init?.headers;
  if (
    headers === undefined ||
    headers instanceof Headers ||
    Array.isArray(headers)
  ) {
    return null;
  }
  return 'Authorization' in headers ? headers.Authorization : null;
};

/** URL of a fetch() call's first argument. */
export const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
};

export const setNavigatorOnline = (online: boolean): void => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
};
