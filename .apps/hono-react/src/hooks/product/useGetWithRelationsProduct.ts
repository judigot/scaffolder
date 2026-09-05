import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsProducts = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['products', 'withRelations', params.relations, params.filters],
    queryFn: () =>
      getWithRelationsResources<IProduct>(
        '/products/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};