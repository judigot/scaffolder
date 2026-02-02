import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkPosts = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IPost[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IPost>('/posts/chunk', params.size, params.filters),
    ...options,
  });
};