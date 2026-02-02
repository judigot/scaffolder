import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { softDeleteResource } from '@/hooks/shared/useSoftDelete.ts';
import { type IPost } from '@/interfaces/IPost.ts';

export const useSoftDeletePost = (
  options?: Omit<
    UseMutationOptions<IPost, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      softDeleteResource<IPost>(`/posts/${String(id)}/soft-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    ...options,
  });
};