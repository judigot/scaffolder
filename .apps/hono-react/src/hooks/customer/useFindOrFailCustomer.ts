import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

export const useFindOrFailCustomer = (
  id: string | number,
  options?: Omit<UseQueryOptions<ICustomer, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['customers', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<ICustomer>(`/customers/${String(id)}/find-or-fail`),
    enabled: Boolean(id),
    ...options,
  });
};