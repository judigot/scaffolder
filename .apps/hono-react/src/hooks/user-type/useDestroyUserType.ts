import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeleteUserType = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/userTypes', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
      queryClient.removeQueries({ queryKey: ['userType', id] });
    },
    ...options,
  });
};