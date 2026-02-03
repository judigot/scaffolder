import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Filter records based on a set of values
 * @param endpoint The API endpoint for where in filtering
 * @param column The column to filter on
 * @param values Array of values to match against
 * @returns Promise resolving to an array of filtered resource objects
 */
export const whereInResources = async <T>(
  endpoint: string,
  column: string,
  values: (string | number)[],
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, { column, values });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to filter resources with whereIn');
  }
};