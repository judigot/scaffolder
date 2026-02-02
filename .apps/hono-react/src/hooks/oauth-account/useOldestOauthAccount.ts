import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestOauthAccounts = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['oauthAccounts', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IOauthAccount>(
        '/oauthAccounts/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};
