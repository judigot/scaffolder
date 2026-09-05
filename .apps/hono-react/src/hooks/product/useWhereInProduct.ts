import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInProducts = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['products', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IProduct>(
        '/products/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};