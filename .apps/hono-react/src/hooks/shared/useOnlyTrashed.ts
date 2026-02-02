import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Get only soft-deleted records
 * @param endpoint The API endpoint for only trashed records
 * @param filters Optional filters to apply
 * @param limit Optional limit for results
 * @param orderBy Optional column to order by
 * @param orderDirection Optional order direction
 * @returns Promise resolving to an array of soft-deleted resource objects
 */
export const getOnlyTrashedResources = async <T>(
  endpoint: string,
  filters?: Record<string, unknown>,
  limit?: number,
  orderBy?: string,
  orderDirection: 'asc' | 'desc' = 'asc',
): Promise<T[]> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      filters,
      limit,
      orderBy,
      orderDirection,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to get only trashed resources');
  }
};