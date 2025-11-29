import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';
import { getApiUrl } from '@/utils/getApiUrl.ts';

interface IFetchFileContentParams {
  publicRepoURL: string;
  filePath: string;
  branch?: string;
}

interface IFileContentResponse {
  content: string;
  isBinary: boolean;
}

interface IErrorResponse {
  message?: string;
  error?: string;
}

const fetchFileContent = async (
  params: IFetchFileContentParams,
): Promise<IFileContentResponse> => {
  if (!params.publicRepoURL || !params.filePath) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await fetch(`${getApiUrl()}/get-file-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicRepoURL: params.publicRepoURL,
        filePath: params.filePath,
        branch: params.branch,
      }),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json();

      const isErrorResponse = (val: unknown): val is IErrorResponse =>
        typeof val === 'object' && val !== null && 'message' in val;

      let errorMessage = `Failed to fetch file content: HTTP ${String(response.status)}`;
      if (isErrorResponse(errorData) && typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      }

      throw new Error(errorMessage);
    }

    const data: unknown = await response.json();

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

    const isFileContentResponse = (
      val: unknown,
    ): val is IFileContentResponse => {
      if (typeof val !== 'object' || val === null) {
        return false;
      }
      const content = getProperty(val, 'content');
      const isBinary = getProperty(val, 'isBinary');
      return typeof content === 'string' && typeof isBinary === 'boolean';
    };

    if (!isFileContentResponse(data)) {
      throw new Error('Invalid response format');
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`There was an error: ${error.message}`);
    }
    throw new Error(`Unknown error: ${String(error)}`);
  }
};

export const useFileContent = (
  params: IFetchFileContentParams,
  enabled = true,
  behavior?: Omit<
    UseQueryOptions<IFileContentResponse>,
    'queryKey' | 'queryFn'
  >,
): UseQueryResult<IFileContentResponse> => {
  return useQuery({
    queryKey: [
      'fileContent',
      params.publicRepoURL,
      params.filePath,
      params.branch,
    ],
    queryFn: () => fetchFileContent(params),
    enabled:
      enabled &&
      !!params.publicRepoURL &&
      !!params.filePath &&
      params.filePath !== '',
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    ...behavior,
  });
};
