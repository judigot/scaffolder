import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestCustomers = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['customers', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<ICustomer>(
        '/customers/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};