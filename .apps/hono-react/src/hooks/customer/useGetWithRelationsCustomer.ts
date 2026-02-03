import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsCustomers = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['customers', 'withRelations', params.relations, params.filters],
    queryFn: () =>
      getWithRelationsResources<ICustomer>(
        '/customers/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};