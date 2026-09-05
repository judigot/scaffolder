import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Restore a soft-deleted record
 * @param endpoint The API endpoint for restoring
 * @returns Promise resolving to the restored resource object
 */
export const restoreResource = async <T>(endpoint: string): Promise<T> => {
  try {
    const response = await axiosInstance.patch(endpoint);
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to restore resource');
  }
};