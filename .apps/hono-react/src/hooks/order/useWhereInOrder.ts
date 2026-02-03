import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInOrders = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IOrder>(
        '/orders/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};