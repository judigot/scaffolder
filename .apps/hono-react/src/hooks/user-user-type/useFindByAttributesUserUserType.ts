import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findByAttributesResources } from '@/hooks/shared/useFindByAttributes.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IFindByAttributesParams {
  attributes: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindByAttributesUserUserTypes = (
  params: IFindByAttributesParams,
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'findByAttributes',
      params.attributes,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findByAttributesResources<IUserUserType>(
        '/userUserTypes/find-by-attributes',
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