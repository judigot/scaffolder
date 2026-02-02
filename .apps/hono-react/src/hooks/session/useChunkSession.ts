import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkSessions = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<ISession[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['sessions', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<ISession>('/sessions/chunk', params.size, params.filters),
    ...options,
  });
};
