import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import ConnectivityIndicator from '@/components/auth/ConnectivityIndicator.tsx';
import SessionExpiredDialog from '@/components/auth/SessionExpiredDialog.tsx';
import { isApiError, isNetworkFailure } from '@/lib/auth/authErrors.ts';
import { recordAuthDiagnostic } from '@/lib/auth/authDiagnostics.ts';
import { clearAuthDependentState } from '@/lib/auth/clearAuthState.ts';
import { getMockAuthConfig, mockTokenProvider } from '@/lib/auth/mockAuth.ts';
import {
  clearLoginAttempts,
  recordLoginRedirect,
  saveReturnContext,
} from '@/lib/auth/returnContext.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';
import {
  configureTokenProvider,
  revalidateSession,
} from '@/lib/auth/tokenManager.ts';

interface IAuthSessionManagerProps {
  children: ReactNode;
}

const getAudience = (): string | undefined => {
  const audience: unknown = import.meta.env.VITE_AUTH0_AUDIENCE;
  return typeof audience === 'string' && audience !== '' ? audience : undefined;
};

const isRecoverableAfterReauth = (error: unknown): boolean =>
  isNetworkFailure(error) ||
  (isApiError(error) &&
    (error.kind === 'unauthorized' || error.kind === 'server'));

/**
 * Coordinates Auth0, the token manager and TanStack Query:
 * - registers the Auth0 token provider used by every protected request,
 * - clears identity-scoped caches on sign-out or identity change,
 * - refetches failed queries after the session recovers,
 * - renders the session-expired dialog and connectivity indicator.
 */
export default function AuthSessionManager({
  children,
}: IAuthSessionManagerProps) {
  const {
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
  } = useAuth0();
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);
  const isMock = getMockAuthConfig() !== null;
  const mockSub = getMockAuthConfig()?.user?.sub;
  const currentSub = isMock ? mockSub : user?.sub;
  const previousSub = useRef<string | undefined>(undefined);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loopPrevented, setLoopPrevented] = useState(false);

  // Register the token provider for the current identity.
  useEffect(() => {
    if (isMock) {
      configureTokenProvider(mockTokenProvider);
      void revalidateSession();
      return () => {
        configureTokenProvider(null);
      };
    }
    if (!isAuthenticated) {
      configureTokenProvider(null);
      return undefined;
    }
    const audience = getAudience();
    configureTokenProvider(({ forceRefresh }) =>
      getAccessTokenSilently({
        authorizationParams: audience === undefined ? undefined : { audience },
        cacheMode: forceRefresh === true ? 'off' : 'on',
      }),
    );
    void revalidateSession();
    return () => {
      configureTokenProvider(null);
    };
  }, [isMock, isAuthenticated, getAccessTokenSilently]);

  // Reset the login-loop guard only once a token was actually obtained, so a
  // session that "authenticates" but cannot issue tokens cannot loop.
  useEffect(() => {
    if (status === 'active') {
      clearLoginAttempts();
    }
  }, [status]);

  // Clear identity-scoped caches when the user signs out or switches account.
  useEffect(() => {
    if (!isMock && isLoading) {
      return;
    }
    const prev = previousSub.current;
    if (prev !== undefined && prev !== currentSub) {
      recordAuthDiagnostic('session.identity-changed', {
        signedOut: currentSub === undefined,
      });
      clearAuthDependentState(queryClient);
      useSessionStore.getState().reset();
    }
    previousSub.current = currentSub;
  }, [currentSub, isLoading, isMock, queryClient]);

  // After recovering from an auth/network failure, refetch queries that
  // failed for those reasons. Permission/validation failures are left alone.
  const recoveredAt = useSessionStore((state) => state.recoveredAt);
  useEffect(() => {
    if (recoveredAt === null) {
      return;
    }
    void queryClient.refetchQueries(
      {
        type: 'active',
        predicate: (query) =>
          query.state.status === 'error' &&
          query.state.errorUpdatedAt <= recoveredAt &&
          isRecoverableAfterReauth(query.state.error),
      },
      { cancelRefetch: false },
    );
  }, [recoveredAt, queryClient]);

  const handleSignIn = useCallback(() => {
    const context = saveReturnContext();
    if (!recordLoginRedirect('session-expired-dialog')) {
      setLoopPrevented(true);
      return;
    }
    setIsRedirecting(true);
    void loginWithRedirect({
      appState: { returnTo: context.returnTo },
    }).catch(() => {
      setIsRedirecting(false);
    });
  }, [loginWithRedirect]);

  const handleSignOut = useCallback(() => {
    setIsRedirecting(true);
    clearAuthDependentState(queryClient);
    clearLoginAttempts();
    void logout({
      logoutParams: {
        returnTo:
          `${window.location.origin}${import.meta.env.BASE_URL}`.replace(
            /\/$/,
            '',
          ),
      },
    });
  }, [logout, queryClient]);

  return (
    <>
      {children}
      <SessionExpiredDialog
        isOpen={status === 'expired'}
        isRedirecting={isRedirecting}
        loopPrevented={loopPrevented}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
      <ConnectivityIndicator />
    </>
  );
}
