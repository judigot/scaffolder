import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Batch updates multiple resources by sending IDs and data to the API
 * @param endpoint The API endpoint for batch update
 * @param ids Array of resource IDs to update
 * @param data The partial data to apply to all resources
 * @returns Promise resolving to an array of updated resource objects
 */
export const batchUpdateResources = async <T, D = Partial<T>>(
  endpoint: string,
  ids: (number | string)[],
  data: D,
): Promise<T[]> => {
  try {
    const response = await axiosInstance.put(endpoint, { ids, data });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to batch update resources');
  }
};