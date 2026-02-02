import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOnlyTrashedResources } from '@/hooks/shared/useOnlyTrashed.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IOnlyTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useOnlyTrashedOrderProducts = (
  params: IOnlyTrashedParams = {},
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orderProducts',
      'onlyTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getOnlyTrashedResources<IOrderProduct>(
        '/orderProducts/only-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};