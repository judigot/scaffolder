import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomCustomers = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<ICustomer[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['customers', 'random', params.limit],
    queryFn: () =>
      getRandomResources<ICustomer>('/customers/random', params.limit),
    ...options,
  });
};