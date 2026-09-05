import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IOrder>;
  data: Omit<IOrder, 'id'>;
}

export const useUpdateOrCreateOrder = (
  options?: Omit<
    UseMutationOptions<IOrder, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IOrder, Omit<IOrder, 'id'>>(
        '/orders/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    ...options,
  });
};