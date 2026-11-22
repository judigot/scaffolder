import {
  focusManager,
  onlineManager,
  QueryClient,
} from '@tanstack/react-query';
import { ApiError } from '@/lib/auth/authErrors.ts';
import { recordAuthDiagnostic } from '@/lib/auth/authDiagnostics.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';

const MAX_TRANSIENT_RETRIES = 2;

/**
 * Retry policy: never retry auth/permission/validation failures (they will
 * not fix themselves and retries just hammer the API); retry transient
 * network/server failures a bounded number of times.
 */
export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (error instanceof ApiError) {
    return error.isTransient && error.kind !== 'offline'
      ? failureCount < MAX_TRANSIENT_RETRIES
      : false;
  }
  // Legacy/unknown errors (including raw network failures): bounded retries.
  return failureCount < MAX_TRANSIENT_RETRIES;
};

export const queryRetryDelay = (attempt: number): number =>
  Math.min(1000 * 2 ** attempt, 8000);

export const createAppQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        networkMode: 'online',
      },
      mutations: {
        // Mutations (Terraform runs, workspace changes) are never retried or
        // queued while offline: a paused mutation would otherwise replay
        // automatically on reconnect, long after the user's intent.
        retry: false,
        networkMode: 'always',
      },
    },
  });

/**
 * Makes TanStack Query's "window focus" signal wait for session revalidation.
 * When a tab becomes visible again, we first make sure the access token is
 * valid (renewing it silently if needed) and only then let stale queries
 * refetch. This prevents the burst of requests with an expired token that
 * used to fail with 401 when returning to an idle tab.
 */
export const installAuthAwareFocusManager = (
  revalidate: () => Promise<unknown>,
): void => {
  focusManager.setEventListener((handleFocus) => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    let generation = 0;

    const resume = () => {
      generation += 1;
      const current = generation;
      void revalidate()
        .catch(() => undefined)
        .finally(() => {
          if (current === generation) {
            handleFocus(true);
          }
        });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        generation += 1;
        handleFocus(false);
        return;
      }
      resume();
    };

    // Android Chrome / iOS Safari restore pages from the back-forward cache
    // without a visibilitychange in some cases.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        resume();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange, false);
    window.addEventListener('pageshow', onPageShow, false);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
    };
  });
};

/** Mirrors TanStack's online state into the session store for the UI. */
export const installConnectivityTracking = (): (() => void) => {
  if (typeof navigator !== 'undefined') {
    onlineManager.setOnline(navigator.onLine);
  }
  useSessionStore.getState().setOnline(onlineManager.isOnline());
  return onlineManager.subscribe((isOnline) => {
    useSessionStore.getState().setOnline(isOnline);
    recordAuthDiagnostic(
      isOnline ? 'connectivity.online' : 'connectivity.offline',
    );
  });
};
