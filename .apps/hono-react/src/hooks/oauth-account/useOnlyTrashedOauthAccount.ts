import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOnlyTrashedResources } from '@/hooks/shared/useOnlyTrashed.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IOnlyTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useOnlyTrashedOauthAccounts = (
  params: IOnlyTrashedParams = {},
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'oauthAccounts',
      'onlyTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getOnlyTrashedResources<IOauthAccount>(
        '/oauthAccounts/only-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};