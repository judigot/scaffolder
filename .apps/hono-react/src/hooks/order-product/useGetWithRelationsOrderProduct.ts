import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsOrderProducts = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orderProducts',
      'withRelations',
      params.relations,
      params.filters,
    ],
    queryFn: () =>
      getWithRelationsResources<IOrderProduct>(
        '/orderProducts/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};