import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Get oldest records
 * @param endpoint The API endpoint for oldest records
 * @param limit Optional limit for number of records
 * @param filters Optional filters to apply
 * @returns Promise resolving to an array of oldest resource objects
 */
export const getOldestResources = async <T>(
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
    handleError(error, 'Failed to get oldest resources');
  }
};