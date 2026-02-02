import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsUsers = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'withRelations', params.relations, params.filters],
    queryFn: () =>
      getWithRelationsResources<IUser>(
        '/users/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};