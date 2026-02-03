import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsUserUserTypes = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'withRelations',
      params.relations,
      params.filters,
    ],
    queryFn: () =>
      getWithRelationsResources<IUserUserType>(
        '/userUserTypes/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};