import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkUsers = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IUser[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IUser>('/users/chunk', params.size, params.filters),
    ...options,
  });
};