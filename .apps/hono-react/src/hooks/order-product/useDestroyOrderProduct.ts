import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeleteOrderProduct = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/orderProducts', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
      queryClient.removeQueries({ queryKey: ['orderProduct', id] });
    },
    ...options,
  });
};