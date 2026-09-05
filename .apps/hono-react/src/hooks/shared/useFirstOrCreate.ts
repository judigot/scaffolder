import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Find or create a record
 * @param endpoint The API endpoint for first or create
 * @param searchCriteria Criteria to search for existing record
 * @param defaults Default values to use when creating
 * @returns Promise resolving to the found or created resource object
 */
export const firstOrCreateResource = async <T>(
  endpoint: string,
  searchCriteria: Partial<T>,
  defaults?: Partial<T>,
): Promise<T> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      searchCriteria,
      defaults,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to find or create resource');
  }
};