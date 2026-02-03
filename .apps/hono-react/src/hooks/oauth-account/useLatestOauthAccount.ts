import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestOauthAccounts = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['oauthAccounts', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IOauthAccount>(
        '/oauthAccounts/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};