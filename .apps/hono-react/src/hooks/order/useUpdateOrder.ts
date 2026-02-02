import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

export const useUpdateOrder = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IOrder, Error, Partial<IOrder>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IOrder>) =>
      useUpdate<IOrder, Partial<IOrder>>('/orders', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    ...options,
  });
};