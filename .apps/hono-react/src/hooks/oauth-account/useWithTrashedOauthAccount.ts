import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithTrashedResources } from '@/hooks/shared/useWithTrashed.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IWithTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithTrashedOauthAccounts = (
  params: IWithTrashedParams = {},
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'oauthAccounts',
      'withTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithTrashedResources<IOauthAccount>(
        '/oauthAccounts/with-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};
