import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { restoreResource } from '@/hooks/shared/useRestore.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

export const useRestoreProduct = (
  options?: Omit<
    UseMutationOptions<IProduct, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      restoreResource<IProduct>(`/products/${String(id)}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    ...options,
  });
};