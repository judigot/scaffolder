import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Check if a record exists
 * @param endpoint The API endpoint for existence check
 * @param criteria The criteria to check for existence
 * @returns Promise resolving to boolean indicating existence
 */
export const existsResource = async (
  endpoint: string,
  criteria: Record<string, unknown>,
): Promise<boolean> => {
  try {
    const response = await axiosInstance.post(endpoint, { criteria });
    return response.data.exists;
  } catch (error: unknown) {
    handleError(error, 'Failed to check if resource exists');
  }
};