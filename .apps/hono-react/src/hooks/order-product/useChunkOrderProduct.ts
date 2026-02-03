import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkOrderProducts = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IOrderProduct[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orderProducts', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IOrderProduct>(
        '/orderProducts/chunk',
        params.size,
        params.filters,
      ),
    ...options,
  });
};