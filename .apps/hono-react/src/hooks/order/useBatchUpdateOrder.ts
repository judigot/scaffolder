import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IOrder>;
}

export const useBatchUpdateOrders = (
  options?: Omit<
    UseMutationOptions<IOrder[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IOrder, Partial<IOrder>>(
        '/orders/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    ...options,
  });
};