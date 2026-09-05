import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IPost>;
}

export const useBatchUpdatePosts = (
  options?: Omit<
    UseMutationOptions<IPost[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IPost, Partial<IPost>>(
        '/posts/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    ...options,
  });
};