import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Filter records within a range of values
 * @param endpoint The API endpoint for where between filtering
 * @param column The column to filter on
 * @param min The minimum value
 * @param max The maximum value
 * @returns Promise resolving to an array of filtered resource objects
 */
export const whereBetweenResources = async <T>(
  endpoint: string,
  column: string,
  min: string | number,
  max: string | number,
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, { column, min, max });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to filter resources with whereBetween');
  }
};