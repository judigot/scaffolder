import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestProducts = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['products', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IProduct>(
        '/products/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};