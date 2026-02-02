import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { softDeleteResource } from '@/hooks/shared/useSoftDelete.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

export const useSoftDeleteOrder = (
  options?: Omit<
    UseMutationOptions<IOrder, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      softDeleteResource<IOrder>(`/orders/${String(id)}/soft-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    ...options,
  });
};