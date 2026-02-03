import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestPosts = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IPost>('/posts/oldest', params.limit, params.filters),
    ...options,
  });
};