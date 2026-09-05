import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithoutTrashedResources } from '@/hooks/shared/useWithoutTrashed.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IWithoutTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithoutTrashedCustomers = (
  params: IWithoutTrashedParams = {},
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'customers',
      'withoutTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithoutTrashedResources<ICustomer>(
        '/customers/without-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};