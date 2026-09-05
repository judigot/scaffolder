import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findManyResources } from '@/hooks/shared/useFindMany.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IFindManyParams {
  ids: (string | number)[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindManyOrderProducts = (
  params: IFindManyParams,
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orderProducts',
      'findMany',
      params.ids,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findManyResources<IOrderProduct>(
        '/orderProducts/find-many',
        params.ids,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(params.ids && params.ids.length > 0),
    ...options,
  });
};