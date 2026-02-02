import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsProfiles = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IProfile[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['profiles', 'withRelations', params.relations, params.filters],
    queryFn: () =>
      getWithRelationsResources<IProfile>(
        '/profiles/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};