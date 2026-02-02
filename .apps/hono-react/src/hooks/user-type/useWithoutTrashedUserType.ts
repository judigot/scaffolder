import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithoutTrashedResources } from '@/hooks/shared/useWithoutTrashed.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IWithoutTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithoutTrashedUserTypes = (
  params: IWithoutTrashedParams = {},
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userTypes',
      'withoutTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithoutTrashedResources<IUserType>(
        '/userTypes/without-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};
