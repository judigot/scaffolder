/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import { IStructure } from '@/components/FileViewer.tsx';

interface IFetchGitHubFilesParams {
  publicRepoURL: string;
}

interface IErrorResponse {
  message?: string;
  error?: string;
}

export const isUsingLocalFiles = true;

/**
 * Fetches project files from a public GitHub repository
 *
 * @param params The parameters for fetching GitHub files
 * @returns A promise that resolves to the fetched files
 */
const fetchGitHubFiles = async (
  params: IFetchGitHubFilesParams,
): Promise<IStructure> => {
  if (!params.publicRepoURL) {
    // Return empty structure if no repo URL provided
    return [];
  }

  try {
    const response = await fetch(
      isUsingLocalFiles
        ? `${String(import.meta.env.VITE_BACKEND_URL)}/getUserFiles`
        : `${String(import.meta.env.VITE_BACKEND_URL)}/getUserFilesFromPublicRepo`,
      {
        method: isUsingLocalFiles ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: isUsingLocalFiles
          ? undefined
          : JSON.stringify({ publicRepoURL: params.publicRepoURL }),
      },
    );

    if (!response.ok) {
      // Using assertion functions instead of 'as' operator
      const errorData: unknown = await response.json();

      // Safe type checking for error response
      const isErrorResponse = (val: unknown): val is IErrorResponse =>
        typeof val === 'object' && val !== null && 'message' in val;

      let errorMessage = `Failed to fetch repository files: HTTP ${String(response.status)}`;
      if (isErrorResponse(errorData) && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      }

      throw new Error(errorMessage);
    }

    // Parse the JSON response safely
    const data: unknown = await response.json();

    // Ensure the data has the correct structure
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected an array');
    }

    // Type guard to ensure we have the correct structure
    function isIStructure(val: unknown): val is IStructure {
      return Array.isArray(val);
    }

    if (!isIStructure(data)) {
      throw new Error('Invalid response format');
    }

    const userFiles = data;

    return userFiles;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'invalid zip data') {
        throw new Error(
          'The repository either does not exist, is not public, or lacks a valid file structure. See documentation for details.',
        );
      }
      throw new Error(`There was an error: ${error.message}`);
    }
    throw new Error(`Unknown error: ${String(error)}`);
  }
};

/**
 * Hook for fetching and caching GitHub files using TanStack Query
 *
 * @param params The parameters for fetching GitHub files
 * @param behavior Optional behavior configuration for the query
 * @returns Query result containing the GitHub files data, loading state, and error state
 */
export const useUserFiles = (
  params: IFetchGitHubFilesParams,
  behavior?: Omit<UseQueryOptions<IStructure>, 'queryKey' | 'queryFn'>,
): UseQueryResult<IStructure> => {
  return useQuery({
    queryKey: ['userFiles', params.publicRepoURL],
    queryFn: () => fetchGitHubFiles({ publicRepoURL: params.publicRepoURL }),

    // Default settings that can be overridden by the behavior parameter
    refetchInterval: 30 * 1000, //
    // Poll every 1 second (short polling).
    // Common use cases: live dashboards, chat notifications, stock tickers, monitoring tools.

    staleTime: 5 * 60 * 1000, // 5 minutes
    // After this period, React Query will treat the data as stale.
    // On remount (when a component using this query mounts again), stale data triggers a refetch.
    // Common use cases: moderately dynamic data like config settings, price lists, user permissions.

    gcTime: 10 * 60 * 1000, // 10 minutes
    // Keep stale and unused cached data for 10 minutes before garbage-collecting it.
    // This allows reusing cached data without fetching again if a component remounts within that period.
    // Common use cases: large or complex data where refetching too often is wasteful, but you still want quick reuse if the user navigates back.

    refetchOnWindowFocus: 'always', // Refetch on window focus — but only if stale
    retry: false,

    ...behavior, // This will override the default settings
  });
};
