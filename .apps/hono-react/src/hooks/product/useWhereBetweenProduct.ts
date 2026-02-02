import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereBetweenResources } from '@/hooks/shared/useWhereBetween.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IWhereBetweenParams {
  column: string;
  min: string | number;
  max: string | number;
}

export const useWhereBetweenProducts = (
  params: IWhereBetweenParams,
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'products',
      'whereBetween',
      params.column,
      params.min,
      params.max,
    ],
    queryFn: () =>
      whereBetweenResources<IProduct>(
        '/products/where-between',
        params.column,
        params.min,
        params.max,
      ),
    ...options,
  });
};