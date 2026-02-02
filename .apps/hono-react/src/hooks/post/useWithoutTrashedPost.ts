import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithoutTrashedResources } from '@/hooks/shared/useWithoutTrashed.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IWithoutTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithoutTrashedPosts = (
  params: IWithoutTrashedParams = {},
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'posts',
      'withoutTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithoutTrashedResources<IPost>(
        '/posts/without-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};