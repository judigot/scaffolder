import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findByAttributesResources } from '@/hooks/shared/useFindByAttributes.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IFindByAttributesParams {
  attributes: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindByAttributesSessions = (
  params: IFindByAttributesParams,
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'sessions',
      'findByAttributes',
      params.attributes,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findByAttributesResources<ISession>(
        '/sessions/find-by-attributes',
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