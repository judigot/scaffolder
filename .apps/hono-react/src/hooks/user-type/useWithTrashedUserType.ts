import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithTrashedResources } from '@/hooks/shared/useWithTrashed.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IWithTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithTrashedUserTypes = (
  params: IWithTrashedParams = {},
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userTypes',
      'withTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithTrashedResources<IUserType>(
        '/userTypes/with-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};
