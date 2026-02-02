import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomPosts = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'random', params.limit],
    queryFn: () => getRandomResources<IPost>('/posts/random', params.limit),
    ...options,
  });
};