import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInOauthAccounts = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['oauthAccounts', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IOauthAccount>(
        '/oauthAccounts/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};