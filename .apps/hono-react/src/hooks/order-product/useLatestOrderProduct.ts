import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestOrderProducts = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orderProducts', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IOrderProduct>(
        '/orderProducts/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};