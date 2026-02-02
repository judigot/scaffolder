import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Find an existing record or return a new instance
 * @param endpoint The API endpoint for first or new
 * @param searchCriteria Criteria to search for existing record
 * @param defaults Default values for new instance
 * @returns Promise resolving to the found or new resource object
 */
export const firstOrNewResource = async <T>(
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
    handleError(error, 'Failed to find or create new resource');
  }
};