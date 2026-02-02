import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Soft delete a record
 * @param endpoint The API endpoint for soft deleting
 * @returns Promise resolving to the soft-deleted resource object
 */
export const softDeleteResource = async <T>(endpoint: string): Promise<T> => {
  try {
    const response = await axiosInstance.delete(endpoint);
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to soft delete resource');
  }
};