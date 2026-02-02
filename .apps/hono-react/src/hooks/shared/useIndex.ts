import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Fetches all resources from the API
 * @returns Promise resolving to an array of resource objects
 */
export const useIndex = async (resource: string): Promise<unknown> => {
  try {
    const response = await axiosInstance.get(`/${resource}`);

    return response.data.data || [];
  } catch (error: unknown) {
    handleError(error, 'Failed to fetch resource');
  }
};