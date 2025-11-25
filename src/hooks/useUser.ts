import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '@/useUserStore.ts';

interface IUserMetadataResponse {
  success?: boolean;
  metadata?: Record<string, unknown> | null;
}

interface ITokenResponse {
  success?: boolean;
  token?: string | null;
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
  accessToken: string | null;
  logout: () => void;
  refreshGitHubToken: () => Promise<void>;
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

const getBackendUrl = (): string => {
  const backendUrlEnv: unknown = import.meta.env.VITE_BACKEND_URL;
  if (typeof backendUrlEnv !== 'string' || backendUrlEnv === '') {
    throw new Error('Backend URL is not configured');
  }
  return backendUrlEnv;
};

const fetchUserMetadata = async (
  accessToken: string,
): Promise<Record<string, unknown> | null> => {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/user-metadata`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to load user metadata: ${String(response.status)} ${response.statusText} ${errorText}`,
    );
  }

  const result: unknown = await response.json();

  if (isMetadataResponse(result) && result.metadata !== undefined) {
    return result.metadata;
  }

  return null;
};

const fetchGitHubToken = async (
  accessToken: string,
): Promise<string | null> => {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/github-token`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const result: unknown = await response.json();

  if (
    isTokenResponse(result) &&
    result.token !== null &&
    result.token !== undefined
  ) {
    return result.token;
  }

  return null;
};

export const useUser = (): IUseUserReturn => {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: auth0Loading,
    getAccessTokenSilently,
    error: auth0Error,
    logout: auth0Logout,
  } = useAuth0();

  const {
    setUser,
    setAccessToken,
    setUserMetadata,
    setGithubToken,
    userMetadata,
    githubToken,
  } = useUserStore();

  const getAccessToken = async (): Promise<string | null> => {
    if (
      !isAuthenticated ||
      auth0User?.sub === undefined ||
      auth0User.sub === ''
    ) {
      return null;
    }

    const audienceEnv: unknown = import.meta.env.VITE_AUTH0_AUDIENCE;
    if (typeof audienceEnv !== 'string' || audienceEnv === '') {
      throw new Error('Auth0 audience is not configured');
    }
    const audience: string = audienceEnv;

    const accessToken = await getAccessTokenSilently({
      authorizationParams: {
        audience,
      },
      cacheMode: 'on',
    });

    if (typeof accessToken !== 'string' || accessToken === '') {
      return null;
    }

    setAccessToken(accessToken);
    return accessToken;
  };

  const {
    data: metadata,
    isLoading: metadataLoading,
    error: metadataError,
  } = useQuery({
    queryKey: ['userMetadata', auth0User?.sub],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      if (accessToken === null) {
        return null;
      }

      const fetchedMetadata = await fetchUserMetadata(accessToken);
      setUserMetadata(fetchedMetadata);
      return fetchedMetadata;
    },
    enabled: isAuthenticated && auth0User?.sub !== undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const {
    data: tokenData,
    isLoading: tokenLoading,
    error: tokenError,
    refetch: refetchToken,
  } = useQuery({
    queryKey: ['githubToken', auth0User?.sub],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      if (accessToken === null) {
        return null;
      }

      const fetchedToken = await fetchGitHubToken(accessToken);
      setGithubToken(fetchedToken);
      return fetchedToken;
    },
    enabled: isAuthenticated && auth0User?.sub !== undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (auth0User) {
      setUser(auth0User);
    }
  }, [auth0User, setUser]);

  const refreshGitHubToken = async (): Promise<void> => {
    await refetchToken();
  };

  const logout = (): void => {
    void auth0Logout({
      logoutParams: { returnTo: window.location.origin },
    });
  };

  const isLoading = auth0Loading || metadataLoading || tokenLoading;
  const error = auth0Error ?? metadataError ?? tokenError ?? null;

  return {
    user: auth0User ?? null,
    userMetadata: metadata ?? userMetadata,
    githubToken: tokenData ?? githubToken,
    isLoading,
    isAuthenticated,
    error: error instanceof Error ? error : null,
    accessToken: useUserStore.getState().accessToken,
    logout,
    refreshGitHubToken,
  };
};
