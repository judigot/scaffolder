import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findManyResources } from '@/hooks/shared/useFindMany.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IFindManyParams {
  ids: (string | number)[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindManyUserTypes = (
  params: IFindManyParams,
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userTypes',
      'findMany',
      params.ids,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findManyResources<IUserType>(
        '/userTypes/find-many',
        params.ids,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(params.ids && params.ids.length > 0),
    ...options,
  });
};
