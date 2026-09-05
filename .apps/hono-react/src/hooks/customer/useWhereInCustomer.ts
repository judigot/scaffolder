import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInCustomers = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['customers', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<ICustomer>(
        '/customers/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};