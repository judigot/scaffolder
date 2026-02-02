import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkOauthAccounts = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IOauthAccount[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['oauthAccounts', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IOauthAccount>(
        '/oauthAccounts/chunk',
        params.size,
        params.filters,
      ),
    ...options,
  });
};
