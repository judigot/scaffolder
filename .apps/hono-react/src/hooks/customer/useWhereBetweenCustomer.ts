import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereBetweenResources } from '@/hooks/shared/useWhereBetween.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IWhereBetweenParams {
  column: string;
  min: string | number;
  max: string | number;
}

export const useWhereBetweenCustomers = (
  params: IWhereBetweenParams,
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'customers',
      'whereBetween',
      params.column,
      params.min,
      params.max,
    ],
    queryFn: () =>
      whereBetweenResources<ICustomer>(
        '/customers/where-between',
        params.column,
        params.min,
        params.max,
      ),
    ...options,
  });
};