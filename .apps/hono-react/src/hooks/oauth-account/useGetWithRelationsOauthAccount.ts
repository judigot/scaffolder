import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithRelationsResources } from '@/hooks/shared/useGetWithRelations.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IGetWithRelationsParams {
  relations: string[];
  filters?: Record<string, unknown>;
}

export const useGetWithRelationsOauthAccounts = (
  params: IGetWithRelationsParams,
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'oauthAccounts',
      'withRelations',
      params.relations,
      params.filters,
    ],
    queryFn: () =>
      getWithRelationsResources<IOauthAccount>(
        '/oauthAccounts/with-relations',
        params.relations,
        params.filters,
      ),
    ...options,
  });
};