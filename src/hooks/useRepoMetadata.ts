import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getApiUrl } from '@/utils/getApiUrl.ts';
import { convertMetadataToIStructure } from '@/utils/convertMetadataToIStructure.ts';
import type { IFileMetadata } from '@/utils/githubApiUtils.ts';

interface IFetchRepoMetadataParams {
  publicRepoURL: string;
  branch?: string;
}

interface IErrorResponse {
  message?: string;
  error?: string;
}

const fetchRepoMetadata = async (
  params: IFetchRepoMetadataParams,
): Promise<IStructure> => {
  if (!params.publicRepoURL) {
    return [];
  }

  try {
    const response = await fetch(`${getApiUrl()}/get-repo-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicRepoURL: params.publicRepoURL,
        branch: params.branch,
      }),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json();

      const isErrorResponse = (val: unknown): val is IErrorResponse =>
        typeof val === 'object' && val !== null && 'message' in val;

      let errorMessage = `Failed to fetch repository metadata: HTTP ${String(response.status)}`;
      if (isErrorResponse(errorData) && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      }

      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected an array');
    }

    const isRecord = (value: unknown): value is Record<string, unknown> => {
      return (
        value !== null && typeof value === 'object' && !Array.isArray(value)
      );
    };

    const getProperty = (obj: unknown, key: string): unknown => {
      if (!isRecord(obj)) {
        return undefined;
      }
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
      }
      return undefined;
    };

    const isFileMetadataArray = (val: unknown): val is IFileMetadata[] => {
      if (!Array.isArray(val)) {
        return false;
      }
      return val.every((item) => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }
        const path = getProperty(item, 'path');
        const type = getProperty(item, 'type');
        return (
          typeof path === 'string' &&
          typeof type === 'string' &&
          (type === 'file' || type === 'folder')
        );
      });
    };

    if (!isFileMetadataArray(data)) {
      throw new Error('Invalid metadata format');
    }

    const structure = convertMetadataToIStructure(data);

    return structure;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`There was an error: ${error.message}`);
    }
    throw new Error(`Unknown error: ${String(error)}`);
  }
};

export const useRepoMetadata = (
  params: IFetchRepoMetadataParams,
  behavior?: Omit<UseQueryOptions<IStructure>, 'queryKey' | 'queryFn'>,
): UseQueryResult<IStructure> => {
  return useQuery({
    queryKey: ['repoMetadata', params.publicRepoURL, params.branch],
    queryFn: () => fetchRepoMetadata(params),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    ...behavior,
  });
};
