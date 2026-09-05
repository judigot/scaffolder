import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Get latest records
 * @param endpoint The API endpoint for latest records
 * @param limit Optional limit for number of records
 * @param filters Optional filters to apply
 * @returns Promise resolving to an array of latest resource objects
 */
export const getLatestResources = async <T>(
  endpoint: string,
  limit?: number,
  filters?: Record<string, unknown>,
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      limit,
      filters,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to get latest resources');
  }
};