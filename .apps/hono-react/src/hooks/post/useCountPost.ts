import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { countResources } from '@/hooks/shared/useCount.ts';

interface ICountParams {
  filters?: Record<string, unknown>;
  distinct?: boolean;
  column?: string;
}

export const useCountPosts = (
  params: ICountParams = {},
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'posts',
      'count',
      params.filters,
      params.distinct,
      params.column,
    ],
    queryFn: () =>
      countResources(
        '/posts/count',
        params.filters,
        params.distinct,
        params.column,
      ),
    ...options,
  });
};