import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomOrderProducts = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orderProducts', 'random', params.limit],
    queryFn: () =>
      getRandomResources<IOrderProduct>('/orderProducts/random', params.limit),
    ...options,
  });
};