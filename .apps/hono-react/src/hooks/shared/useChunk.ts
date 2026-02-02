import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Chunk records for processing
 * @param endpoint The API endpoint for chunking records
 * @param size The size of each chunk
 * @param filters Optional filters to apply
 * @returns Promise resolving to an array of record chunks
 */
export const chunkResources = async <T>(
  endpoint: string,
  size: number,
  filters?: Record<string, unknown>,
): Promise<T[][]> => {
  try {
    const response = await axiosInstance.post(endpoint, { size, filters });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to chunk resources');
  }
};