import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Fetches a single resource by ID from the API
 * @param endpoint The API endpoint (without ID)
 * @param id The ID of the resource to fetch
 * @returns Promise resolving to the resource object
 */
export const useFindById = async <T>(
  endpoint: string,
  id: number | string,
): Promise<T> => {
  try {
    const response = await axiosInstance.get(`${endpoint}/${id}`);
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to fetch resource');
  }
};