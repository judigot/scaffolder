import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { softDeleteResource } from '@/hooks/shared/useSoftDelete.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

export const useSoftDeleteOrderProduct = (
  options?: Omit<
    UseMutationOptions<IOrderProduct, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      softDeleteResource<IOrderProduct>(
        `/orderProducts/${String(id)}/soft-delete`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
    ...options,
  });
};