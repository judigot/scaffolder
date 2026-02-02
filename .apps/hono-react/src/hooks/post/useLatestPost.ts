import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestPosts = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IPost>('/posts/latest', params.limit, params.filters),
    ...options,
  });
};