import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IPost>;
  data: Omit<IPost, 'id'>;
}

export const useUpdateOrCreatePost = (
  options?: Omit<
    UseMutationOptions<IPost, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IPost, Omit<IPost, 'id'>>(
        '/posts/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    ...options,
  });
};