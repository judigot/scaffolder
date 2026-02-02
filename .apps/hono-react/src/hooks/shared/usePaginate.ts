import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  currentPage: number;
  perPage: number;
  lastPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginate records
 * @param endpoint The API endpoint for pagination
 * @param page The page number to retrieve
 * @param perPage Number of records per page
 * @param filters Optional filters to apply
 * @param sortBy Optional column to sort by
 * @param sortDirection Sort direction (asc or desc)
 * @returns Promise resolving to paginated response with metadata
 */
export const paginateResources = async <T>(
  endpoint: string,
  page = 1,
  perPage = 15,
  filters?: Record<string, unknown>,
  sortBy?: string,
  sortDirection: 'asc' | 'desc' = 'asc',
): Promise<IPaginatedResponse<T>> => {
  try {
    const response = await axiosInstance.post(endpoint, {
      page,
      perPage,
      filters,
      sortBy,
      sortDirection,
    });
    return response.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to paginate resources');
  }
};