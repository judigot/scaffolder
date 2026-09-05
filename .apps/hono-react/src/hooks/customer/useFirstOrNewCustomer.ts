import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<ICustomer>;
  defaults?: Partial<ICustomer>;
}

export const useFirstOrNewCustomer = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<ICustomer, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'customers',
      'firstOrNew',
      params.searchCriteria,
      params.defaults,
    ],
    queryFn: () =>
      firstOrNewResource<ICustomer>(
        '/customers/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};