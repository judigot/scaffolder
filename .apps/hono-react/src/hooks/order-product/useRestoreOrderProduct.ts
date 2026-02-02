import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { restoreResource } from '@/hooks/shared/useRestore.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

export const useRestoreOrderProduct = (
  options?: Omit<
    UseMutationOptions<IOrderProduct, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      restoreResource<IOrderProduct>(`/orderProducts/${String(id)}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
    ...options,
  });
};