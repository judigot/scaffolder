import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IOrderProduct>;
  defaults?: Partial<IOrderProduct>;
}

export const useFirstOrNewOrderProduct = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IOrderProduct, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orderProducts',
      'firstOrNew',
      params.searchCriteria,
      params.defaults,
    ],
    queryFn: () =>
      firstOrNewResource<IOrderProduct>(
        '/orderProducts/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};