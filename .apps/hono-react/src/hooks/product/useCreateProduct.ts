import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

export const useCreateProduct = (
  options?: Omit<
    UseMutationOptions<IProduct, Error, Omit<IProduct, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IProduct, 'id'>) =>
      createResource<IProduct, Omit<IProduct, 'id'>>('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    ...options,
  });
};