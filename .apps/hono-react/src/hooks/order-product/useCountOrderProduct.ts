import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { countResources } from '@/hooks/shared/useCount.ts';

interface ICountParams {
  filters?: Record<string, unknown>;
  distinct?: boolean;
  column?: string;
}

export const useCountOrderProducts = (
  params: ICountParams = {},
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orderProducts',
      'count',
      params.filters,
      params.distinct,
      params.column,
    ],
    queryFn: () =>
      countResources(
        '/orderProducts/count',
        params.filters,
        params.distinct,
        params.column,
      ),
    ...options,
  });
};