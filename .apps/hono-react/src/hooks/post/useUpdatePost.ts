import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IPost } from '@/interfaces/IPost.ts';

export const useUpdatePost = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IPost, Error, Partial<IPost>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IPost>) =>
      useUpdate<IPost, Partial<IPost>>('/posts', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
    ...options,
  });
};