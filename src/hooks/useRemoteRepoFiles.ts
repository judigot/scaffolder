import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';
import { getApiUrl } from '@/utils/getApiUrl.ts';

interface IFetchRemoteRepoFilesParams {
  repoUrl: string;
}

interface IErrorResponse {
  message?: string;
  error?: string;
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
 * Type guard for IFile
 */
const isFile = (item: unknown): item is IFile => {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  if (!hasProperty(item, 'name') || !hasProperty(item, 'type')) {
    return false;
  }
  return typeof item.name === 'string' && item.type === 'file';
};

/**
 * Type guard for IFolder
 */
const isFolder = (item: unknown): item is IFolder => {
  if (typeof item !== 'object' || item === null) {
    return false;
  }
  if (!hasProperty(item, 'name') || !hasProperty(item, 'type') || !hasProperty(item, 'children')) {
    return false;
  }
  return (
    typeof item.name === 'string' &&
    item.type === 'folder' &&
    Array.isArray(item.children)
  );
};

/**
 * Type guard for IStructure (array of files and folders)
 */
const isStructure = (data: unknown): data is IStructure => {
  if (!Array.isArray(data)) {
    return false;
  }
  return data.every((item) => isFile(item) || isFolder(item));
};

/**
 * Fetches files from a public GitHub repository
 * Always uses the remote endpoint (not local files)
 */
const fetchRemoteRepoFiles = async (
  params: IFetchRemoteRepoFilesParams,
): Promise<IStructure> => {
  if (!params.repoUrl) {
    return [];
  }

  try {
    const response = await fetch(`${getApiUrl()}/getUserFilesFromPublicRepo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicRepoURL: params.repoUrl }),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json();

      const isErrorResponse = (val: unknown): val is IErrorResponse =>
        typeof val === 'object' && val !== null && 'message' in val;

      let errorMessage = `Failed to fetch repository files: HTTP ${String(response.status)}`;
      if (isErrorResponse(errorData) && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      }

      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();

    if (!isStructure(data)) {
      throw new Error('Invalid response format: expected an array of files and folders');
    }

    return data;
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
 * Hook for fetching files from a remote public GitHub repository
 * Unlike useUserFiles, this ALWAYS fetches from the remote GitHub API
 */
export const useRemoteRepoFiles = (
  params: IFetchRemoteRepoFilesParams,
  behavior?: Omit<UseQueryOptions<IStructure>, 'queryKey' | 'queryFn'>,
): UseQueryResult<IStructure> => {
  return useQuery({
    queryKey: ['remoteRepoFiles', params.repoUrl],
    queryFn: () => fetchRemoteRepoFiles({ repoUrl: params.repoUrl }),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    ...behavior,
  });
};
