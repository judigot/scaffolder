import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findByAttributesResources } from '@/hooks/shared/useFindByAttributes.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IFindByAttributesParams {
  attributes: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindByAttributesOrderProducts = (
  params: IFindByAttributesParams,
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orderProducts',
      'findByAttributes',
      params.attributes,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findByAttributesResources<IOrderProduct>(
        '/orderProducts/find-by-attributes',
        params.attributes,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(
      params.attributes && Object.keys(params.attributes).length > 0,
    ),
    ...options,
  });
};