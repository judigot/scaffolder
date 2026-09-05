import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Retrieve related models
 * @param endpoint The API endpoint for getting records with relations
 * @param relations Array of relation names to include
 * @param filters Optional filters to apply
 * @returns Promise resolving to an array of resource objects with relations
 */
export const getWithRelationsResources = async <T>(
  endpoint: string,
  relations: string[],
  filters?: Record<string, unknown>,
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, { relations, filters });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to get resources with relations');
  }
};