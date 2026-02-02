import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findManyResources } from '@/hooks/shared/useFindMany.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IFindManyParams {
  ids: (string | number)[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindManyUserUserTypes = (
  params: IFindManyParams,
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'findMany',
      params.ids,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findManyResources<IUserUserType>(
        '/userUserTypes/find-many',
        params.ids,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(params.ids && params.ids.length > 0),
    ...options,
  });
};
