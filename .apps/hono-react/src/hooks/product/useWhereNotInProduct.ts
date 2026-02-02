import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInProducts = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['products', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IProduct>(
        '/products/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};