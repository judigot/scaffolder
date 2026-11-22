/**
 * Single source of truth for access tokens on the client.
 *
 * Every protected request asks this module for a token immediately before it
 * is sent, instead of reusing a value captured in React state or Zustand.
 * The Auth0 SDK owns caching and refresh-token rotation; this module adds:
 *
 * - de-duplication of concurrent token requests (one renewal in flight),
 * - classification of Auth0 failures into "transient" vs "login required",
 * - a hard gate that blocks protected calls once the session has expired,
 * - privacy-safe diagnostics.
 */
import {
  ApiError,
  getAuth0ErrorCode,
  isInteractiveLoginRequired,
  isNetworkFailure,
  SessionExpiredError,
} from '@/lib/auth/authErrors.ts';
import { recordAuthDiagnostic } from '@/lib/auth/authDiagnostics.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';
import { useUserStore } from '@/useUserStore.ts';

export interface ITokenRequestOptions {
  /** Bypass the SDK cache and force a refresh-token exchange. */
  forceRefresh?: boolean;
}

/** Function that returns a fresh access token (wraps getAccessTokenSilently). */
export type TokenProvider = (options: ITokenRequestOptions) => Promise<string>;

/** How long a request waits for Auth0 to finish initializing. */
const PROVIDER_WAIT_MS = 10_000;

let provider: TokenProvider | null = null;
let inFlight: Promise<string> | null = null;
let inFlightForced: Promise<string> | null = null;
let providerWaiters: ((ready: TokenProvider) => void)[] = [];

export const configureTokenProvider = (next: TokenProvider | null): void => {
  provider = next;
  if (next !== null) {
    const waiters = providerWaiters;
    providerWaiters = [];
    for (const resolve of waiters) {
      resolve(next);
    }
  }
};

/**
 * Child components may issue requests before the session manager (a parent)
 * registers the Auth0 provider in its effect. Wait briefly instead of failing.
 */
const waitForProvider = (): Promise<TokenProvider> => {
  if (provider !== null) {
    return Promise.resolve(provider);
  }
  return new Promise<TokenProvider>((resolve, reject) => {
    const onReady = (ready: TokenProvider) => {
      clearTimeout(timer);
      resolve(ready);
    };
    const timer = setTimeout(() => {
      providerWaiters = providerWaiters.filter((entry) => entry !== onReady);
      reject(
        new ApiError({
          kind: 'unauthorized',
          message: 'Authentication is still initializing. Please try again.',
        }),
      );
    }, PROVIDER_WAIT_MS);
    providerWaiters.push(onReady);
  });
};

export const hasTokenProvider = (): boolean => provider !== null;

const requestToken = async (options: ITokenRequestOptions): Promise<string> => {
  const activeProvider = await waitForProvider();

  const session = useSessionStore.getState();
  const wasExpired = session.status === 'expired';
  if (!wasExpired) {
    session.setStatus('refreshing');
  }
  recordAuthDiagnostic('token.refresh.start', {
    forced: options.forceRefresh === true,
  });

  try {
    const token = await activeProvider(options);
    if (typeof token !== 'string' || token === '') {
      throw new ApiError({ kind: 'unauthorized' });
    }
    useSessionStore.getState().markActive();
    useUserStore.getState().setAccessToken(token);
    recordAuthDiagnostic('token.refresh.success', {
      forced: options.forceRefresh === true,
    });
    if (wasExpired) {
      recordAuthDiagnostic('session.restored');
    }
    return token;
  } catch (error: unknown) {
    const errorCode = getAuth0ErrorCode(error);
    recordAuthDiagnostic('token.refresh.failure', {
      errorCode: errorCode ?? (error instanceof Error ? error.name : 'unknown'),
      forced: options.forceRefresh === true,
    });

    if (isInteractiveLoginRequired(error)) {
      const reason = errorCode ?? 'login_required';
      useUserStore.getState().setAccessToken(null);
      useSessionStore.getState().markExpired(reason);
      recordAuthDiagnostic('session.expired', { errorCode: reason });
      throw new SessionExpiredError(reason, error);
    }

    // Transient failure (timeout/offline): keep the session, let callers
    // retry, and refetch failed queries once a later renewal succeeds.
    if (!wasExpired) {
      useSessionStore.getState().setStatus('active');
      useSessionStore.getState().markRecoveryPending();
    }
    if (error instanceof ApiError) {
      throw error;
    }
    if (isNetworkFailure(error) || errorCode === 'timeout') {
      throw new ApiError({ kind: 'network', cause: error });
    }
    throw new ApiError({ kind: 'unauthorized', cause: error });
  }
};

/**
 * Returns a valid access token, renewing it silently when needed.
 * Concurrent callers share the same in-flight request.
 *
 * @throws SessionExpiredError when interactive login is required, or when the
 *   session is already known to be expired (no network call is made).
 */
export const getAccessToken = (
  options: ITokenRequestOptions = {},
): Promise<string> => {
  if (useSessionStore.getState().status === 'expired') {
    recordAuthDiagnostic('request.blocked', { reason: 'session-expired' });
    return Promise.reject(
      new SessionExpiredError(
        useSessionStore.getState().expiredReason ?? 'login_required',
      ),
    );
  }

  if (options.forceRefresh === true) {
    inFlightForced ??= requestToken({ forceRefresh: true }).finally(() => {
      inFlightForced = null;
    });
    return inFlightForced;
  }

  // A forced refresh already in flight also satisfies a normal request.
  if (inFlightForced !== null) {
    return inFlightForced;
  }
  inFlight ??= requestToken({}).finally(() => {
    inFlight = null;
  });
  return inFlight;
};

/**
 * Re-checks the session (e.g. when a tab becomes visible). Never throws.
 * Returns true when the session is usable.
 */
export const revalidateSession = async (): Promise<boolean> => {
  if (provider === null) {
    return false;
  }
  if (useSessionStore.getState().status === 'expired') {
    return false;
  }
  recordAuthDiagnostic('session.revalidate');
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
};

/** Test helper: clears provider and in-flight state. */
export const resetTokenManager = (): void => {
  provider = null;
  providerWaiters = [];
  inFlight = null;
  inFlightForced = null;
};
