import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereBetweenResources } from '@/hooks/shared/useWhereBetween.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IWhereBetweenParams {
  column: string;
  min: string | number;
  max: string | number;
}

export const useWhereBetweenOrderProducts = (
  params: IWhereBetweenParams,
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orderProducts',
      'whereBetween',
      params.column,
      params.min,
      params.max,
    ],
    queryFn: () =>
      whereBetweenResources<IOrderProduct>(
        '/orderProducts/where-between',
        params.column,
        params.min,
        params.max,
      ),
    ...options,
  });
};