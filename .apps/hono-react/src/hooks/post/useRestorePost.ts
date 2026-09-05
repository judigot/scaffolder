import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { restoreResource } from '@/hooks/shared/useRestore.ts';
import { type IPost } from '@/interfaces/IPost.ts';

export const useRestorePost = (
  options?: Omit<
    UseMutationOptions<IPost, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      restoreResource<IPost>(`/posts/${String(id)}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    ...options,
  });
};