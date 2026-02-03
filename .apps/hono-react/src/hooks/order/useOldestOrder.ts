import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestOrders = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IOrder>(
        '/orders/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};