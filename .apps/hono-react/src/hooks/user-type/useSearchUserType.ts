import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchResources } from '@/hooks/shared/useSearch.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface ISearchParams {
  query: string;
  columns?: string[];
  filters?: Record<string, unknown>;
  limit?: number;
}

export const useSearchUserTypes = (
  params: ISearchParams,
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userTypes',
      'search',
      params.query,
      params.columns,
      params.filters,
      params.limit,
    ],
    queryFn: () =>
      searchResources<IUserType>(
        '/userTypes/search',
        params.query,
        params.columns,
        params.filters,
        params.limit,
      ),
    enabled: Boolean(params.query?.trim()),
    ...options,
  });
};
