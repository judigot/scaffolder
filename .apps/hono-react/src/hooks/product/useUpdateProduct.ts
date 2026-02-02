import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

export const useUpdateProduct = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IProduct, Error, Partial<IProduct>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IProduct>) =>
      useUpdate<IProduct, Partial<IProduct>>('/products', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
    ...options,
  });
};