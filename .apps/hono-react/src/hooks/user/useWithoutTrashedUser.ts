import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithoutTrashedResources } from '@/hooks/shared/useWithoutTrashed.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IWithoutTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithoutTrashedUsers = (
  params: IWithoutTrashedParams = {},
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'users',
      'withoutTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithoutTrashedResources<IUser>(
        '/users/without-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};