import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchResources } from '@/hooks/shared/useSearch.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface ISearchParams {
  query: string;
  columns?: string[];
  filters?: Record<string, unknown>;
  limit?: number;
}

export const useSearchOauthAccounts = (
  params: ISearchParams,
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'oauthAccounts',
      'search',
      params.query,
      params.columns,
      params.filters,
      params.limit,
    ],
    queryFn: () =>
      searchResources<IOauthAccount>(
        '/oauthAccounts/search',
        params.query,
        params.columns,
        params.filters,
        params.limit,
      ),
    enabled: Boolean(params.query?.trim()),
    ...options,
  });
};