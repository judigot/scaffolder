import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  accessToken: string | null;
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

import { getApiUrl } from '@/utils/getApiUrl.ts';

const fetchUserMetadata = async (
  accessToken: string,
): Promise<{
  metadata: Record<string, unknown> | null;
  serverConfigStatus: IServerConfigStatus | null;
}> => {
  const response = await fetch(`${getApiUrl()}/user-metadata`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return { metadata: null, serverConfigStatus: null };
  }

  const result: unknown = await response.json();

  if (isMetadataResponse(result)) {
    return {
      metadata: result.metadata ?? null,
      serverConfigStatus: result.serverConfigStatus ?? null,
    };
  }

  return { metadata: null, serverConfigStatus: null };
};

const fetchGitHubToken = async (
  accessToken: string,
): Promise<{
  token: string | null;
  encryptionAvailable: boolean;
  isTokenEncrypted: boolean | null;
  serverConfigStatus: IServerConfigStatus | null;
}> => {
  const response = await fetch(`${getApiUrl()}/github-token`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return {
      token: null,
      encryptionAvailable: false,
      isTokenEncrypted: null,
      serverConfigStatus: null,
    };
  }

  const result: unknown = await response.json();

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
    data: metadataResult,
    isLoading: metadataLoading,
    error: metadataError,
  } = useQuery({
    queryKey: ['userMetadata', auth0User?.sub],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      if (accessToken === null) {
        return { metadata: null, serverConfigStatus: null };
      }

      const result = await fetchUserMetadata(accessToken);
      setUserMetadata(result.metadata);
      return result;
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
        return {
          token: null,
          encryptionAvailable: false,
          isTokenEncrypted: null,
          serverConfigStatus: null,
        };
      }

      const fetchedData = await fetchGitHubToken(accessToken);
      setGithubToken(fetchedData.token);
      return fetchedData;
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

  const serverConfigStatus =
    tokenData?.serverConfigStatus ?? metadataResult?.serverConfigStatus ?? null;

  return {
    user: auth0User ?? null,
    userMetadata: metadataResult?.metadata ?? userMetadata,
    githubToken: tokenData?.token ?? githubToken,
    isLoading,
    isAuthenticated,
    error: error instanceof Error ? error : null,
    accessToken: useUserStore.getState().accessToken,
    logout,
    refreshGitHubToken,
    encryptionAvailable: tokenData?.encryptionAvailable ?? false,
    isTokenEncrypted: tokenData?.isTokenEncrypted ?? null,
    serverConfigStatus,
  };
};
