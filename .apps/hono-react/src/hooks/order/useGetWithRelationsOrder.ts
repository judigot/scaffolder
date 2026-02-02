import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsOrders = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IOrder[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'withRelations', params.relations, params.filters],
    queryFn: () =>
      getWithRelationsResources<IOrder>(
        '/orders/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};