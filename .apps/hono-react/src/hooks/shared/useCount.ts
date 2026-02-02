import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Count records by criteria
 * @param endpoint The API endpoint for counting
 * @param filters Optional filters to apply
 * @param distinct Whether to count distinct values
 * @param column Optional specific column to count
 * @returns Promise resolving to the count number
 */
export const countResources = async (
  endpoint: string,
  filters?: Record<string, unknown>,
  distinct?: boolean,
  column?: string,
): Promise<number> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      filters,
      distinct,
      column,
    });
    return response.data.count;
  } catch (error: unknown) {
    handleError(error, 'Failed to count resources');
  }
};