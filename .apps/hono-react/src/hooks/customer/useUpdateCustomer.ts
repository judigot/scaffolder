import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

export const useUpdateCustomer = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<ICustomer, Error, Partial<ICustomer>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ICustomer>) =>
      useUpdate<ICustomer, Partial<ICustomer>>('/customers', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
    ...options,
  });
};