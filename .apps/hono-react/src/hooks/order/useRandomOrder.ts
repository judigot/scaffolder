import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomOrders = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'random', params.limit],
    queryFn: () => getRandomResources<IOrder>('/orders/random', params.limit),
    ...options,
  });
};