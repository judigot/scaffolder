import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchResources } from '@/hooks/shared/useSearch.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface ISearchParams {
  query: string;
  columns?: string[];
  filters?: Record<string, unknown>;
  limit?: number;
}

export const useSearchUsers = (
  params: ISearchParams,
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'users',
      'search',
      params.query,
      params.columns,
      params.filters,
      params.limit,
    ],
    queryFn: () =>
      searchResources<IUser>(
        '/users/search',
        params.query,
        params.columns,
        params.filters,
        params.limit,
      ),
    enabled: Boolean(params.query?.trim()),
    ...options,
  });
};