import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Creates a resource by sending data to the API
 * @param endpoint The API endpoint
 * @param data The resource data to create
 * @returns Promise resolving to the created resource object
 */
export const createResource = async <T, D = Partial<T>>(
  endpoint: string,
  data: D,
): Promise<T> => {
  try {
    const response = await axiosInstance.post(endpoint, data);
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to create resource');
  }
};