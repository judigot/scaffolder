import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Order records by specific column
 * @param endpoint The API endpoint for ordering
 * @param column The column to order by
 * @param direction The sort direction (asc or desc)
 * @param limit Optional limit for results
 * @param filters Optional filters to apply
 * @returns Promise resolving to an array of ordered resource objects
 */
export const orderByResources = async <T>(
  endpoint: string,
  column: string,
  direction: 'asc' | 'desc' = 'asc',
  limit?: number,
  filters?: Record<string, unknown>,
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      column,
      direction,
      limit,
      filters,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to order resources');
  }
};