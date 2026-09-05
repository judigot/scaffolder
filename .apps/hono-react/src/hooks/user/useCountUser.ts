import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { countResources } from '@/hooks/shared/useCount.ts';

interface ICountParams {
  filters?: Record<string, unknown>;
  distinct?: boolean;
  column?: string;
}

export const useCountUsers = (
  params: ICountParams = {},
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'users',
      'count',
      params.filters,
      params.distinct,
      params.column,
    ],
    queryFn: () =>
      countResources(
        '/users/count',
        params.filters,
        params.distinct,
        params.column,
      ),
    ...options,
  });
};