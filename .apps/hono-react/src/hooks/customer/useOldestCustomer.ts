import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestCustomers = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['customers', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<ICustomer>(
        '/customers/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};