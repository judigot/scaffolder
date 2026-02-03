import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Updates a resource by ID by sending data to the API
 * @param endpoint The API endpoint (without ID)
 * @param id The ID of the resource to update
 * @param data The partial data to update
 * @returns Promise resolving to the updated resource object
 */
export const useUpdate = async <T, D = Partial<T>>(
  endpoint: string,
  id: number | string,
  data: D,
): Promise<T> => {
  try {
    const response = await axiosInstance.put(`${endpoint}/${id}`, data);
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to update resource');
  }
};