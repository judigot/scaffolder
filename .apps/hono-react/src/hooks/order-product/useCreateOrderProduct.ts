import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

export const useCreateOrderProduct = (
  options?: Omit<
    UseMutationOptions<IOrderProduct, Error, Omit<IOrderProduct, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IOrderProduct, 'id'>) =>
      createResource<IOrderProduct, Omit<IOrderProduct, 'id'>>(
        '/orderProducts',
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
    ...options,
  });
};