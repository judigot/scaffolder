import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { orderByResources } from '@/hooks/shared/useOrderBy.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IOrderByParams {
  column: string;
  direction?: 'asc' | 'desc';
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOrderByOauthAccounts = (
  params: IOrderByParams,
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'oauthAccounts',
      'orderBy',
      params.column,
      params.direction,
      params.limit,
      params.filters,
    ],
    queryFn: () =>
      orderByResources<IOauthAccount>(
        '/oauthAccounts/order-by',
        params.column,
        params.direction,
        params.limit,
        params.filters,
      ),
    enabled: Boolean(params.column),
    ...options,
  });
};
