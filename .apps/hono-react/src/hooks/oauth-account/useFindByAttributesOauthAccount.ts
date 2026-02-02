import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findByAttributesResources } from '@/hooks/shared/useFindByAttributes.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IFindByAttributesParams {
  attributes: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindByAttributesOauthAccounts = (
  params: IFindByAttributesParams,
  options?: Omit<UseQueryOptions<IOauthAccount[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'oauthAccounts',
      'findByAttributes',
      params.attributes,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findByAttributesResources<IOauthAccount>(
        '/oauthAccounts/find-by-attributes',
        params.attributes,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(
      params.attributes && Object.keys(params.attributes).length > 0,
    ),
    ...options,
  });
};
