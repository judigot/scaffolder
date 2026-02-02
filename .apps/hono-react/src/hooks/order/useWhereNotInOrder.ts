import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInOrders = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IOrder>(
        '/orders/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};