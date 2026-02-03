import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IPost } from '@/interfaces/IPost.ts';

export const useCreatePost = (
  options?: Omit<
    UseMutationOptions<IPost, Error, Omit<IPost, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IPost, 'id'>) =>
      createResource<IPost, Omit<IPost, 'id'>>('/posts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    ...options,
  });
};