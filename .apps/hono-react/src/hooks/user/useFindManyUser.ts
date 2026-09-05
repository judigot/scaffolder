import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findManyResources } from '@/hooks/shared/useFindMany.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IFindManyParams {
  ids: (string | number)[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useFindManyUsers = (
  params: IFindManyParams,
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'users',
      'findMany',
      params.ids,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      findManyResources<IUser>(
        '/users/find-many',
        params.ids,
        params.orderBy,
        params.orderDirection,
      ),
    enabled: Boolean(params.ids && params.ids.length > 0),
    ...options,
  });
};