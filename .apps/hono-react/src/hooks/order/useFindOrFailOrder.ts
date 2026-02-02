import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

export const useFindOrFailOrder = (
  id: string | number,
  options?: Omit<UseQueryOptions<IOrder, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IOrder>(`/orders/${String(id)}/find-or-fail`),
    enabled: Boolean(id),
    ...options,
  });
};