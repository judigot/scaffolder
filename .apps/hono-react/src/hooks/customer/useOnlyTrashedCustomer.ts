import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOnlyTrashedResources } from '@/hooks/shared/useOnlyTrashed.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IOnlyTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useOnlyTrashedCustomers = (
  params: IOnlyTrashedParams = {},
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'customers',
      'onlyTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getOnlyTrashedResources<ICustomer>(
        '/customers/only-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};