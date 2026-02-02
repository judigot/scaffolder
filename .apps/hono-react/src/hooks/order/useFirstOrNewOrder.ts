import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IOrder>;
  defaults?: Partial<IOrder>;
}

export const useFirstOrNewOrder = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IOrder, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'firstOrNew', params.searchCriteria, params.defaults],
    queryFn: () =>
      firstOrNewResource<IOrder>(
        '/orders/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};