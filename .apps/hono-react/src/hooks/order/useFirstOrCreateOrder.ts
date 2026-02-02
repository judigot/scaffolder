import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IOrder>;
  defaults?: Partial<IOrder>;
}

export const useFirstOrCreateOrder = (
  options?: Omit<
    UseMutationOptions<IOrder, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IOrder>(
        '/orders/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    ...options,
  });
};