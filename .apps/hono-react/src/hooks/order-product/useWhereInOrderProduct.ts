import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInOrderProducts = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orderProducts', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IOrderProduct>(
        '/orderProducts/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};