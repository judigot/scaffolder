import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestOrders = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IOrder>(
        '/orders/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};