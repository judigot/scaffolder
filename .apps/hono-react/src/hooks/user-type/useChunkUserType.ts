import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkUserTypes = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IUserType[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userTypes', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IUserType>(
        '/userTypes/chunk',
        params.size,
        params.filters,
      ),
    ...options,
  });
};