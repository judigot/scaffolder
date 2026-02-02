import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

export const useFindOrFailOauthAccount = (
  id: string | number,
  options?: Omit<UseQueryOptions<IOauthAccount, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['oauthAccounts', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IOauthAccount>(
        `/oauthAccounts/${String(id)}/find-or-fail`,
      ),
    enabled: Boolean(id),
    ...options,
  });
};