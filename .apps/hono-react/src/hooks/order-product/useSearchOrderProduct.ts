import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchResources } from '@/hooks/shared/useSearch.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface ISearchParams {
  query: string;
  columns?: string[];
  filters?: Record<string, unknown>;
  limit?: number;
}

export const useSearchOrderProducts = (
  params: ISearchParams,
  options?: Omit<UseQueryOptions<IOrderProduct[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'orderProducts',
      'search',
      params.query,
      params.columns,
      params.filters,
      params.limit,
    ],
    queryFn: () =>
      searchResources<IOrderProduct>(
        '/orderProducts/search',
        params.query,
        params.columns,
        params.filters,
        params.limit,
      ),
    enabled: Boolean(params.query?.trim()),
    ...options,
  });
};