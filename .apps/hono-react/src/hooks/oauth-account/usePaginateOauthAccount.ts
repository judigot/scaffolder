import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { paginateResources } from '@/hooks/shared/usePaginate.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

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

export const usePaginateOauthAccounts = (
  params: IPaginateParams = {},
  options?: Omit<
    UseQueryOptions<IPaginatedResponse<IOauthAccount>, Error>,
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
      'oauthAccounts',
      'paginate',
      page,
      perPage,
      filters,
      sortBy,
      sortDirection,
    ],
    queryFn: () =>
      paginateResources<IOauthAccount>(
        '/oauthAccounts/paginate',
        page,
        perPage,
        filters,
        sortBy,
        sortDirection,
      ),
    ...options,
  });
};
