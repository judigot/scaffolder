import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestProducts = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['products', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IProduct>(
        '/products/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};