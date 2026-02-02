import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<ICustomer>;
}

export const useBatchUpdateCustomers = (
  options?: Omit<
    UseMutationOptions<ICustomer[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<ICustomer, Partial<ICustomer>>(
        '/customers/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    ...options,
  });
};