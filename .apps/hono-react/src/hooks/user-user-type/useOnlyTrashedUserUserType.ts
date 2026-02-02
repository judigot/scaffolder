import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOnlyTrashedResources } from '@/hooks/shared/useOnlyTrashed.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IOnlyTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useOnlyTrashedUserUserTypes = (
  params: IOnlyTrashedParams = {},
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'onlyTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getOnlyTrashedResources<IUserUserType>(
        '/userUserTypes/only-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};
