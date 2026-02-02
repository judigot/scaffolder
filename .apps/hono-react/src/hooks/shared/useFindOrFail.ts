import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Find a record or throw an error if not found
 * @param endpoint The API endpoint for finding the record
 * @returns Promise resolving to the resource object or throwing an error
 */
export const findOrFailResource = async <T>(endpoint: string): Promise<T> => {
  try {
    const response = await axiosInstance.get(endpoint);
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Resource not found');
  }
};