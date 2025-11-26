import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../useUserStore';
const isMetadataResponse = (val) => {
  return (
    typeof val === 'object' &&
    val !== null &&
    ('success' in val || 'metadata' in val)
  );
};
const isTokenResponse = (val) => {
  return (
    typeof val === 'object' &&
    val !== null &&
    ('success' in val || 'token' in val)
  );
};
import { getApiUrl } from '../utils/getApiUrl';
const getBackendUrl = () => {
  return getApiUrl();
};
const fetchUserMetadata = async (accessToken) => {
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
  const result = await response.json();
  if (isMetadataResponse(result) && result.metadata !== undefined) {
    return result.metadata;
  }
  return null;
};
const fetchGitHubToken = async (accessToken) => {
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
  const result = await response.json();
  if (
    isTokenResponse(result) &&
    result.token !== null &&
    result.token !== undefined
  ) {
    return result.token;
  }
  return null;
};
export const useUser = () => {
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
  const getAccessToken = async () => {
    if (
      !isAuthenticated ||
      auth0User?.sub === undefined ||
      auth0User.sub === ''
    ) {
      return null;
    }
    const audienceEnv = import.meta.env.VITE_AUTH0_AUDIENCE;
    if (typeof audienceEnv !== 'string' || audienceEnv === '') {
      throw new Error('Auth0 audience is not configured');
    }
    const audience = audienceEnv;
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
  const refreshGitHubToken = async () => {
    await refetchToken();
  };
  const logout = () => {
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
