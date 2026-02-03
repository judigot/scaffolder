import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Creates or updates a resource based on search criteria
 * @param endpoint The API endpoint for update or create
 * @param searchCriteria Criteria to find existing resource
 * @param data The resource data to create or update with
 * @returns Promise resolving to the created or updated resource object
 */
export const updateOrCreateResource = async <T, D = Omit<T, 'id'>>(
  endpoint: string,
  searchCriteria: Partial<T>,
  data: D,
): Promise<T> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      searchCriteria,
      data,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to update or create resource');
  }
};