import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOnlyTrashedResources } from '@/hooks/shared/useOnlyTrashed.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IOnlyTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useOnlyTrashedOrders = (
  params: IOnlyTrashedParams = {},
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orders',
      'onlyTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getOnlyTrashedResources<IOrder>(
        '/orders/only-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};