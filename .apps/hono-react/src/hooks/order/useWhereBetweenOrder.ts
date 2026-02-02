import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereBetweenResources } from '@/hooks/shared/useWhereBetween.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IWhereBetweenParams {
  column: string;
  min: string | number;
  max: string | number;
}

export const useWhereBetweenOrders = (
  params: IWhereBetweenParams,
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'whereBetween', params.column, params.min, params.max],
    queryFn: () =>
      whereBetweenResources<IOrder>(
        '/orders/where-between',
        params.column,
        params.min,
        params.max,
      ),
    ...options,
  });
};