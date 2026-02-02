import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { eachResource } from '@/hooks/shared/useEach.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IEachParams {
  batchSize?: number;
  filters?: Record<string, unknown>;
  callback: (item: IPost) => void | Promise<void>;
}

export const useEachPosts = (
  options?: Omit<UseMutationOptions<void, Error, IEachParams>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchSize, filters, callback }: IEachParams) =>
      eachResource<IPost>('/posts/each', callback, batchSize, filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    ...options,
  });
};