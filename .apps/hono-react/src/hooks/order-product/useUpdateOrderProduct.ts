import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

export const useUpdateOrderProduct = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IOrderProduct, Error, Partial<IOrderProduct>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IOrderProduct>) =>
      useUpdate<IOrderProduct, Partial<IOrderProduct>>(
        '/orderProducts',
        id,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
      queryClient.invalidateQueries({ queryKey: ['orderProduct', id] });
    },
    ...options,
  });
};