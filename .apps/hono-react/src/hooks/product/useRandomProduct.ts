import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomProducts = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['products', 'random', params.limit],
    queryFn: () =>
      getRandomResources<IProduct>('/products/random', params.limit),
    ...options,
  });
};