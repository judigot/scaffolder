import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

export const useCreateCustomer = (
  options?: Omit<
    UseMutationOptions<ICustomer, Error, Omit<ICustomer, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<ICustomer, 'id'>) =>
      createResource<ICustomer, Omit<ICustomer, 'id'>>('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    ...options,
  });
};