import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkProducts = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IProduct[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['products', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IProduct>('/products/chunk', params.size, params.filters),
    ...options,
  });
};