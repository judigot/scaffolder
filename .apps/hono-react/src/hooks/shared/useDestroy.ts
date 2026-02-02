import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Deletes a resource by ID from the API
 * @param endpoint The API endpoint (without ID)
 * @param id The ID of the resource to delete
 * @returns Promise resolving to void on successful deletion
 */
export const deleteResource = async (
  endpoint: string,
  id: number | string,
): Promise<void> => {
  try {
    await axiosInstance.delete(`${endpoint}/${id}`);
  } catch (error: unknown) {
    handleError(error, 'Failed to delete resource');
  }
};