import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Find a record by specific attributes
 * @param endpoint The API endpoint for finding by attributes
 * @param attributes The attributes to search by
 * @param limit Optional limit for results
 * @param orderBy Optional column to order by
 * @param orderDirection Optional order direction
 * @returns Promise resolving to an array of matching resource objects
 */
export const findByAttributesResources = async <T>(
  endpoint: string,
  attributes: Record<string, unknown>,
  limit?: number,
  orderBy?: string,
  orderDirection: 'asc' | 'desc' = 'asc',
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      attributes,
      limit,
      orderBy,
      orderDirection,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to find resources by attributes');
  }
};