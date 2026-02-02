import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { chunkResources } from '@/hooks/shared/useChunk.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IChunkParams {
  size: number;
  filters?: Record<string, unknown>;
}

export const useChunkOrders = (
  params: IChunkParams,
  options?: Omit<UseQueryOptions<IOrder[][]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orders', 'chunk', params.size, params.filters],
    queryFn: () =>
      chunkResources<IOrder>('/orders/chunk', params.size, params.filters),
    ...options,
  });
};