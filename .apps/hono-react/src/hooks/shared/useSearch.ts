import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Search records
 * @param endpoint The API endpoint for searching
 * @param query The search query string
 * @param columns Optional columns to search in
 * @param filters Optional additional filters
 * @param limit Optional limit for results
 * @returns Promise resolving to an array of matching resource objects
 */
export const searchResources = async <T>(
  endpoint: string,
  query: string,
  columns?: string[],
  filters?: Record<string, unknown>,
  limit?: number,
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      query,
      columns,
      filters,
      limit,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to search resources');
  }
};