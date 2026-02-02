import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IProduct>;
  defaults?: Partial<IProduct>;
}

export const useFirstOrNewProduct = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IProduct, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'products',
      'firstOrNew',
      params.searchCriteria,
      params.defaults,
    ],
    queryFn: () =>
      firstOrNewResource<IProduct>(
        '/products/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};