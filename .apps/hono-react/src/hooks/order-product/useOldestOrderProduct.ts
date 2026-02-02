import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestOrderProducts = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orderProducts', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IOrderProduct>(
        '/orderProducts/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};