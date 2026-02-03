import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Find multiple records by IDs
 * @param endpoint The API endpoint for finding multiple records
 * @param ids Array of IDs to find
 * @param orderBy Optional column to order by
 * @param orderDirection Optional order direction
 * @returns Promise resolving to an array of resource objects
 */
export const findManyResources = async <T>(
  endpoint: string,
  ids: (string | number)[],
  orderBy?: string,
  orderDirection: 'asc' | 'desc' = 'asc',
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      ids,
      orderBy,
      orderDirection,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to find multiple resources');
  }
};