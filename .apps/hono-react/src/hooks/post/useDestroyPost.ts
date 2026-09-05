import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeletePost = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/posts', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.removeQueries({ queryKey: ['post', id] });
    },
    ...options,
  });
};