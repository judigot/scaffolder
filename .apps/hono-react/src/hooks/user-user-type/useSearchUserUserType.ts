import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchResources } from '@/hooks/shared/useSearch.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface ISearchParams {
  query: string;
  columns?: string[];
  filters?: Record<string, unknown>;
  limit?: number;
}

export const useSearchUserUserTypes = (
  params: ISearchParams,
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'search',
      params.query,
      params.columns,
      params.filters,
      params.limit,
    ],
    queryFn: () =>
      searchResources<IUserUserType>(
        '/userUserTypes/search',
        params.query,
        params.columns,
        params.filters,
        params.limit,
      ),
    enabled: Boolean(params.query?.trim()),
    ...options,
  });
};
