import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomOauthAccounts = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['oauthAccounts', 'random', params.limit],
    queryFn: () =>
      getRandomResources<IOauthAccount>('/oauthAccounts/random', params.limit),
    ...options,
  });
};