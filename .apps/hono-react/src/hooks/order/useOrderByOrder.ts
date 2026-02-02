import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { orderByResources } from '@/hooks/shared/useOrderBy.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IOrderByParams {
  column: string;
  direction?: 'asc' | 'desc';
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOrderByOrders = (
  params: IOrderByParams,
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orders',
      'orderBy',
      params.column,
      params.direction,
      params.limit,
      params.filters,
    ],
    queryFn: () =>
      orderByResources<IOrder>(
        '/orders/order-by',
        params.column,
        params.direction,
        params.limit,
        params.filters,
      ),
    enabled: Boolean(params.column),
    ...options,
  });
};