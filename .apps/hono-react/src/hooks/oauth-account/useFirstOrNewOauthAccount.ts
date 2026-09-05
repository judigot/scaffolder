import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IOauthAccount>;
  defaults?: Partial<IOauthAccount>;
}

export const useFirstOrNewOauthAccount = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IOauthAccount, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'oauthAccounts',
      'firstOrNew',
      params.searchCriteria,
      params.defaults,
    ],
    queryFn: () =>
      firstOrNewResource<IOauthAccount>(
        '/oauthAccounts/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};