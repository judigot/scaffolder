import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithTrashedResources } from '@/hooks/shared/useWithTrashed.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IWithTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithTrashedCustomers = (
  params: IWithTrashedParams = {},
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'customers',
      'withTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithTrashedResources<ICustomer>(
        '/customers/with-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};