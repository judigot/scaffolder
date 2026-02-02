import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeleteUserUserType = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/userUserTypes', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
      queryClient.removeQueries({ queryKey: ['userUserType', id] });
    },
    ...options,
  });
};