import {
  keepPreviousData,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import type { IFile, IStructure } from '@/components/FileViewer.tsx';
import { extractProjectsFromFiles } from '@/utils/extractProjectsFromFiles.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';

interface IFetchGitHubFilesParams {
  publicRepoURL: string;
}

interface IErrorResponse {
  message?: string;
  error?: string;
}

/**
 * Transformed data structure returned by useUserFiles.
 * Contains both the raw files and extracted projects in a single object,
 * eliminating the sync gap between TanStack Query and Zustand state.
 */
export interface IUserFilesData {
  userFiles: IStructure;
  projects: IFile[];
}

const isProduction = import.meta.env.PROD;

export const isUsingLocalFiles = !isProduction;

/**
 * Fetches project files from a public GitHub repository or local /files directory
 *
 * @param params The parameters for fetching GitHub files
 * @returns A promise that resolves to the fetched files
 */
const fetchGitHubFiles = async (
  params: IFetchGitHubFilesParams,
): Promise<IStructure> => {
  // Determine if we should use local files:
  // - Empty publicRepoURL means use local files (dev mode toggle set to "Local")
  // - Non-empty publicRepoURL means fetch from remote GitHub repo
  const useLocal = params.publicRepoURL === '';

  // If remote mode but no URL provided, return empty
  if (!useLocal && !params.publicRepoURL) {
    return [];
  }

  try {
    const apiUrl = useLocal
      ? `${getApiUrl()}/getUserFiles`
      : `${getApiUrl()}/getUserFilesFromPublicRepo`;

    const response = await fetch(apiUrl, {
      method: useLocal ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: useLocal
        ? undefined
        : JSON.stringify({ publicRepoURL: params.publicRepoURL }),
    });

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
          'Unable to fetch repository. This can happen if: the repository is empty (no commits), it does not exist, it is private, or uses a non-standard default branch.',
        );
      }
      throw new Error(`There was an error: ${error.message}`);
    }
    throw new Error(`Unknown error: ${String(error)}`);
  }
};

/**
 * Hook for fetching and caching GitHub files using TanStack Query.
 *
 * Uses the `select` option to synchronously transform the raw file structure
 * into an object containing both files and extracted projects. This eliminates
 * the render-cycle gap that previously caused UI flicker.
 *
 * Best practices applied:
 * - `placeholderData: keepPreviousData` - Shows previous data during refetch (replaces deprecated keepPreviousData option)
 * - `select` - Synchronous transformation, no useEffect sync needed
 * - Returns `isPending` for proper "no data yet" checks
 *
 * @param params The parameters for fetching GitHub files
 * @param behavior Optional behavior configuration for the query
 * @returns Query result containing userFiles, projects, loading states, and error state
 */
export const useUserFiles = (
  params: IFetchGitHubFilesParams,
  behavior?: Omit<
    UseQueryOptions<IStructure, Error, IUserFilesData>,
    'queryKey' | 'queryFn' | 'select'
  >,
): UseQueryResult<IUserFilesData> => {
  return useQuery({
    queryKey: ['userFiles', params.publicRepoURL],
    queryFn: () => fetchGitHubFiles({ publicRepoURL: params.publicRepoURL }),
    // Use select for synchronous transformation - projects are extracted in the same render cycle
    select: (userFiles): IUserFilesData => ({
      userFiles,
      projects: extractProjectsFromFiles(userFiles),
    }),
    // Use placeholderData instead of deprecated keepPreviousData option
    // This keeps showing previous data while new data is being fetched
    placeholderData: keepPreviousData,
    refetchInterval: 30 * 1000,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: 'always',
    retry: false,
    ...behavior,
  });
};
