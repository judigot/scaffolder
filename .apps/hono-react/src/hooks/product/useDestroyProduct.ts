import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeleteProduct = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/products', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.removeQueries({ queryKey: ['product', id] });
    },
    ...options,
  });
};