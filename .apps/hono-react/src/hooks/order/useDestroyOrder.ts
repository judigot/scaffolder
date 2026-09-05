import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeleteOrder = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/orders', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.removeQueries({ queryKey: ['order', id] });
    },
    ...options,
  });
};