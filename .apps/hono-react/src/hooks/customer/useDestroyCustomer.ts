import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeleteCustomer = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/customers', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.removeQueries({ queryKey: ['customer', id] });
    },
    ...options,
  });
};