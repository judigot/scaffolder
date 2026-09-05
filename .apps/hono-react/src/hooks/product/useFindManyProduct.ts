import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findManyResources } from '@/hooks/shared/useFindMany.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IFindManyParams {
  ids: (string | number)[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindManyProducts = (
  params: IFindManyParams,
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'products',
      'findMany',
      params.ids,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findManyResources<IProduct>(
        '/products/find-many',
        params.ids,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(params.ids && params.ids.length > 0),
    ...options,
  });
};