import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

export const useFindOrFailOrderProduct = (
  id: string | number,
  options?: Omit<UseQueryOptions<IOrderProduct, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orderProducts', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IOrderProduct>(
        `/orderProducts/${String(id)}/find-or-fail`,
      ),
    enabled: Boolean(id),
    ...options,
  });
};