import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { paginateResources } from '@/hooks/shared/usePaginate.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

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

export const usePaginateOrderProducts = (
  params: IPaginateParams = {},
  options?: Omit<
    UseQueryOptions<IPaginatedResponse<IOrderProduct>, Error>,
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
      'orderProducts',
      'paginate',
      page,
      perPage,
      filters,
      sortBy,
      sortDirection,
    ],
    queryFn: () =>
      paginateResources<IOrderProduct>(
        '/orderProducts/paginate',
        page,
        perPage,
        filters,
        sortBy,
        sortDirection,
      ),
    ...options,
  });
};