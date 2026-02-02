import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Retrieve a list of specific column values
 * @param endpoint The API endpoint for plucking values
 * @param column The column to pluck values from
 * @param key Optional key column for associative array
 * @returns Promise resolving to an array of column values
 */
export const pluckResources = async (
  endpoint: string,
  column: string,
  key?: string,
): Promise<(string | number)[]> => {
  try {
    const response = await axiosInstance.post(endpoint, { column, key });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to pluck resource values');
  }
};