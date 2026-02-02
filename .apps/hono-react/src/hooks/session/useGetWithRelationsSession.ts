import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsSessions = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['sessions', 'withRelations', params.relations, params.filters],
    queryFn: () =>
      getWithRelationsResources<ISession>(
        '/sessions/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};
