import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { paginateResources } from '@/hooks/shared/usePaginate.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IPaginateParams {
  page?: number;
  perPage?: number;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  currentPage: number;
  perPage: number;
  lastPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const usePaginatePosts = (
  params: IPaginateParams = {},
  options?: Omit<
    UseQueryOptions<IPaginatedResponse<IPost>, Error>,
    'queryKey' | 'queryFn'
  >,
) => {
  const {
    page = 1,
    perPage = 15,
    filters,
    sortBy,
    sortDirection = 'asc',
  } = params;

  return useQuery({
    queryKey: [
      'posts',
      'paginate',
      page,
      perPage,
      filters,
      sortBy,
      sortDirection,
    ],
    queryFn: () =>
      paginateResources<IPost>(
        '/posts/paginate',
        page,
        perPage,
        filters,
        sortBy,
        sortDirection,
      ),
    ...options,
  });
};