import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsPosts = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'withRelations', params.relations, params.filters],
    queryFn: () =>
      getWithRelationsResources<IPost>(
        '/posts/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};