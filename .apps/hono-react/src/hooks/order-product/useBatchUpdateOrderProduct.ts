import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IOrderProduct>;
}

export const useBatchUpdateOrderProducts = (
  options?: Omit<
    UseMutationOptions<IOrderProduct[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IOrderProduct, Partial<IOrderProduct>>(
        '/orderProducts/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
    ...options,
  });
};