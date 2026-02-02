import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findManyResources } from '@/hooks/shared/useFindMany.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IFindManyParams {
  ids: (string | number)[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindManyOrders = (
  params: IFindManyParams,
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orders',
      'findMany',
      params.ids,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findManyResources<IOrder>(
        '/orders/find-many',
        params.ids,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(params.ids && params.ids.length > 0),
    ...options,
  });
};