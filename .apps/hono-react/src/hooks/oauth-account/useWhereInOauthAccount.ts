import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInOauthAccounts = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['oauthAccounts', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IOauthAccount>(
        '/oauthAccounts/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};
