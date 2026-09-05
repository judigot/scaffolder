import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsUserTypes = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userTypes', 'withRelations', params.relations, params.filters],
    queryFn: () =>
      getWithRelationsResources<IUserType>(
        '/userTypes/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};