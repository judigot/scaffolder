import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithTrashedResources } from '@/hooks/shared/useWithTrashed.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IWithTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithTrashedProducts = (
  params: IWithTrashedParams = {},
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'products',
      'withTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithTrashedResources<IProduct>(
        '/products/with-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};