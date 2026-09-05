import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInCustomers = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['customers', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<ICustomer>(
        '/customers/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};