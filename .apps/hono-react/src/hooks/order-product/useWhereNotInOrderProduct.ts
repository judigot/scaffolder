import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInOrderProducts = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orderProducts', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IOrderProduct>(
        '/orderProducts/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};