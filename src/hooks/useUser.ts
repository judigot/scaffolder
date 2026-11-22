import { useAuth0 } from '@auth0/auth0-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authFetchJson } from '@/lib/api/authFetch.ts';
import { clearAuthDependentState } from '@/lib/auth/clearAuthState.ts';
import { getMockAuthConfig } from '@/lib/auth/mockAuth.ts';
import { useUserStore } from '@/useUserStore.ts';

interface IServerConfigStatus {
  auth0ManagementApiConfigured?: boolean;
}

interface IUserMetadataResponse {
  success?: boolean;
  metadata?: Record<string, unknown> | null;
  serverConfigStatus?: IServerConfigStatus;
}

interface ITokenResponse {
  success?: boolean;
  token?: string | null;
  encryptionAvailable?: boolean;
  isTokenEncrypted?: boolean | null;
  serverConfigStatus?: IServerConfigStatus;
  error?: string;
  message?: string;
  code?: string;
}

interface IUser {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

interface IUseUserReturn {
  user: IUser | null;
  userMetadata: Record<string, unknown> | null;
  githubToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  /**
   * Last token issued by the token manager. Prefer `authFetch`, which fetches
   * a fresh token right before each request; this value is kept for legacy
   * consumers and is updated reactively whenever the token is renewed.
   */
  accessToken: string | null;
  /** Error from the metadata request (auth, network, server...). */
  metadataError: Error | null;
  /** True once the metadata request has completed successfully at least once. */
  isMetadataLoaded: boolean;
  isMetadataFetching: boolean;
  refetchMetadata: () => Promise<void>;
  logout: () => void;
  refreshGitHubToken: () => Promise<void>;
  encryptionAvailable: boolean;
  isTokenEncrypted: boolean | null;
  serverConfigStatus: IServerConfigStatus | null;
}

const isMetadataResponse = (val: unknown): val is IUserMetadataResponse => {
  return (
    typeof val === 'object' &&
    val !== null &&
    ('success' in val || 'metadata' in val)
  );
};

const isTokenResponse = (val: unknown): val is ITokenResponse => {
  return (
    typeof val === 'object' &&
    val !== null &&
    ('success' in val || 'token' in val)
  );
};

/**
 * Both endpoints below go through the centralized authenticated client, which
 * fetches a valid token right before the request and throws typed errors.
 * A 401 is therefore surfaced as an authentication error instead of being
 * silently converted into "no metadata" (which used to leave Infrastructure
 * Control showing skeleton loaders forever).
 */
export const fetchUserMetadata = async (): Promise<{
  metadata: Record<string, unknown> | null;
  serverConfigStatus: IServerConfigStatus | null;
}> => {
  const result = await authFetchJson('/user-metadata', {
    errorMessage: 'Could not load your account settings.',
  });

  if (isMetadataResponse(result)) {
    return {
      metadata: result.metadata ?? null,
      serverConfigStatus: result.serverConfigStatus ?? null,
    };
  }

  return { metadata: null, serverConfigStatus: null };
};

export const fetchGitHubToken = async (): Promise<{
  token: string | null;
  encryptionAvailable: boolean;
  isTokenEncrypted: boolean | null;
  serverConfigStatus: IServerConfigStatus | null;
}> => {
  const result = await authFetchJson('/github-token', {
    errorMessage: 'Could not load your GitHub connection.',
  });

  if (isTokenResponse(result)) {
    return {
      token: result.token ?? null,
      encryptionAvailable: result.encryptionAvailable ?? false,
      isTokenEncrypted: result.isTokenEncrypted ?? null,
      serverConfigStatus: result.serverConfigStatus ?? null,
    };
  }

  return {
    token: null,
    encryptionAvailable: false,
    isTokenEncrypted: null,
    serverConfigStatus: null,
  };
};

export const useUser = (): IUseUserReturn => {
  const mockAuth = getMockAuthConfig();
  const {
    user: auth0User,
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0Loading,
    error: auth0Error,
    logout: auth0Logout,
  } = useAuth0();

  const queryClient = useQueryClient();
  const isAuthenticated = auth0IsAuthenticated || mockAuth !== null;
  const user = mockAuth?.user ?? auth0User ?? null;

  const {
    setUser,
    setUserMetadata,
    setGithubToken,
    userMetadata,
    githubToken,
  } = useUserStore();
  // Subscribed (not read via getState) so consumers re-render with the token
  // renewed by the token manager, e.g. after returning to an idle tab.
  const storeAccessToken = useUserStore((state) => state.accessToken);

  const {
    data: metadataResult,
    isLoading: metadataLoading,
    isSuccess: metadataLoaded,
    isFetching: metadataFetching,
    error: metadataError,
    refetch: refetchMetadataQuery,
  } = useQuery({
    queryKey: ['userMetadata', user?.sub],
    queryFn: async () => {
      if (mockAuth?.userMetadata) {
        const metadata = mockAuth.userMetadata;
        setUserMetadata(metadata);
        return { metadata, serverConfigStatus: null };
      }

      const result = await fetchUserMetadata();
      setUserMetadata(result.metadata);
      return result;
    },
    enabled: isAuthenticated && user?.sub !== undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const {
    data: tokenData,
    isLoading: tokenLoading,
    error: tokenError,
    refetch: refetchToken,
  } = useQuery({
    queryKey: ['githubToken', user?.sub],
    queryFn: async () => {
      if (mockAuth?.userMetadata) {
        const token =
          typeof mockAuth.userMetadata.github_token === 'string'
            ? mockAuth.userMetadata.github_token
            : null;
        setGithubToken(token);
        return {
          token,
          encryptionAvailable: true,
          isTokenEncrypted: false,
          serverConfigStatus: null,
        };
      }

      const fetchedData = await fetchGitHubToken();
      setGithubToken(fetchedData.token);
      return fetchedData;
    },
    enabled: isAuthenticated && user?.sub !== undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  const refreshGitHubToken = async (): Promise<void> => {
    await refetchToken();
  };

  const refetchMetadata = async (): Promise<void> => {
    await refetchMetadataQuery();
  };

  const logout = (): void => {
    // Never let the next user on this browser see the previous user's data.
    clearAuthDependentState(queryClient);
    void auth0Logout({
      logoutParams: {
        returnTo:
          `${window.location.origin}${import.meta.env.BASE_URL}`.replace(
            /\/$/,
            '',
          ),
      },
    });
  };

  const isLoading =
    (mockAuth === null && auth0Loading) || metadataLoading || tokenLoading;
  const error =
    mockAuth !== null
      ? null
      : (auth0Error ?? metadataError ?? tokenError ?? null);

  const serverConfigStatus =
    tokenData?.serverConfigStatus ?? metadataResult?.serverConfigStatus ?? null;

  return {
    user,
    userMetadata: metadataResult?.metadata ?? userMetadata,
    githubToken: tokenData?.token ?? githubToken,
    isLoading,
    isAuthenticated,
    error: error instanceof Error ? error : null,
    accessToken: mockAuth?.accessToken ?? storeAccessToken,
    metadataError: metadataError ?? null,
    isMetadataLoaded: metadataLoaded || metadataResult !== undefined,
    isMetadataFetching: metadataFetching,
    refetchMetadata,
    logout,
    refreshGitHubToken,
    encryptionAvailable: tokenData?.encryptionAvailable ?? false,
    isTokenEncrypted: tokenData?.isTokenEncrypted ?? null,
    serverConfigStatus,
  };
};
