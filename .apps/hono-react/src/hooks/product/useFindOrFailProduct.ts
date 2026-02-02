import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

export const useFindOrFailProduct = (
  id: string | number,
  options?: Omit<UseQueryOptions<IProduct, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['products', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IProduct>(`/products/${String(id)}/find-or-fail`),
    enabled: Boolean(id),
    ...options,
  });
};