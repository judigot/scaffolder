import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IProduct>;
}

export const useBatchUpdateProducts = (
  options?: Omit<
    UseMutationOptions<IProduct[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IProduct, Partial<IProduct>>(
        '/products/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    ...options,
  });
};