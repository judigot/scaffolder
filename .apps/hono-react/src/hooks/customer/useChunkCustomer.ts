import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkCustomers = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<ICustomer[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['customers', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<ICustomer>(
        '/customers/chunk',
        params.size,
        params.filters,
      ),
    ...options,
  });
};