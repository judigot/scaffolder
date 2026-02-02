import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IPost>;
  defaults?: Partial<IPost>;
}

export const useFirstOrCreatePost = (
  options?: Omit<
    UseMutationOptions<IPost, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IPost>(
        '/posts/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    ...options,
  });
};