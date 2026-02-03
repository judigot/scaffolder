import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkProfiles = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IProfile[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['profiles', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IProfile>('/profiles/chunk', params.size, params.filters),
    ...options,
  });
};