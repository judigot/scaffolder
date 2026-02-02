import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkUserUserTypes = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IUserUserType[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userUserTypes', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IUserUserType>(
        '/userUserTypes/chunk',
        params.size,
        params.filters,
      ),
    ...options,
  });
};