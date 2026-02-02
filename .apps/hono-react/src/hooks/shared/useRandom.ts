import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Get random records
 * @param endpoint The API endpoint for random records
 * @param limit Optional limit for number of random records
 * @returns Promise resolving to an array of random resource objects
 */
export const getRandomResources = async <T>(
  endpoint: string,
  limit?: number,
): Promise<T[]> => {
  try {
    const response = await axiosInstance.get(endpoint, {
      params: { limit },
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to get random resources');
  }
};