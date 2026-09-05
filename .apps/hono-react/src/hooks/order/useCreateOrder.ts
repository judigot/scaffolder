import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

export const useCreateOrder = (
  options?: Omit<
    UseMutationOptions<IOrder, Error, Omit<IOrder, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IOrder, 'id'>) =>
      createResource<IOrder, Omit<IOrder, 'id'>>('/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    ...options,
  });
};