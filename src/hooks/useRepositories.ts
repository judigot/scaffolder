import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';

export interface IStoredRepository {
  repoUrl: string;
  addedAt: string;
}

interface IUseRepositoriesResult {
  repositories: IStoredRepository[];
  isLoading: boolean;
  error: string | null;
  addRepository: (repoUrl: string) => Promise<boolean>;
  removeRepository: (repoUrl: string) => Promise<boolean>;
  refreshRepositories: () => void;
}

/**
 * Helper to safely check if an object has a property
 */
const hasProperty = <K extends string>(
  obj: object,
  key: K,
): obj is object & Record<K, unknown> => {
  return key in obj;
};

/**
 * Type guard for stored repository
 */
const isStoredRepository = (repo: unknown): repo is IStoredRepository => {
  if (typeof repo !== 'object' || repo === null) {
    return false;
  }
  if (!hasProperty(repo, 'repoUrl') || !hasProperty(repo, 'addedAt')) {
    return false;
  }
  return (
    typeof repo.repoUrl === 'string' &&
    typeof repo.addedAt === 'string'
  );
};

/**
 * Hook for managing user repositories stored in Auth0 user_metadata
 */
export function useRepositories(): IUseRepositoriesResult {
  const { userMetadata, accessToken } = useUser();
  const [repositories, setRepositories] = useState<IStoredRepository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract repositories from user metadata
  useEffect(() => {
    if (userMetadata !== null && typeof userMetadata === 'object' && 'repositories' in userMetadata) {
      const storedRepos = userMetadata.repositories;
      if (Array.isArray(storedRepos)) {
        const validRepos = storedRepos.filter(isStoredRepository);
        setRepositories(validRepos);
      }
    }
    setIsLoading(false);
  }, [userMetadata]);

  const saveRepositories = useCallback(
    async (repos: IStoredRepository[]): Promise<boolean> => {
      if (accessToken === null || accessToken === '') {
        setError('Not authenticated');
        return false;
      }

      try {
        const response = await fetch(`${getApiUrl()}/user-metadata/repositories`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ repositories: repos }),
        });

        if (!response.ok) {
          const errorData: unknown = await response.json().catch(() => ({}));
          let errorMessage = 'Failed to save repositories';
          if (
            typeof errorData === 'object' &&
            errorData !== null &&
            hasProperty(errorData, 'message') &&
            typeof errorData.message === 'string'
          ) {
            errorMessage = errorData.message;
          }
          setError(errorMessage);
          return false;
        }

        setRepositories(repos);
        setError(null);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save repositories';
        setError(message);
        return false;
      }
    },
    [accessToken]
  );

  const addRepository = useCallback(
    async (repoUrl: string): Promise<boolean> => {
      // Check if already exists
      if (repositories.some((r) => r.repoUrl.toLowerCase() === repoUrl.toLowerCase())) {
        setError('Repository already exists');
        return false;
      }

      const newRepo: IStoredRepository = {
        repoUrl,
        addedAt: new Date().toISOString(),
      };

      const updatedRepos = [...repositories, newRepo];
      return saveRepositories(updatedRepos);
    },
    [repositories, saveRepositories]
  );

  const removeRepository = useCallback(
    async (repoUrl: string): Promise<boolean> => {
      const updatedRepos = repositories.filter(
        (r) => r.repoUrl.toLowerCase() !== repoUrl.toLowerCase()
      );
      return saveRepositories(updatedRepos);
    },
    [repositories, saveRepositories]
  );

  const refreshRepositories = useCallback(() => {
    // Force re-read from userMetadata
    if (userMetadata !== null && typeof userMetadata === 'object' && 'repositories' in userMetadata) {
      const storedRepos = userMetadata.repositories;
      if (Array.isArray(storedRepos)) {
        const validRepos = storedRepos.filter(isStoredRepository);
        setRepositories(validRepos);
      }
    }
  }, [userMetadata]);

  return {
    repositories,
    isLoading,
    error,
    addRepository,
    removeRepository,
    refreshRepositories,
  };
}
