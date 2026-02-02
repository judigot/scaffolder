import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInPosts = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IPost>('/posts/where-in', params.column, params.values),
    ...options,
  });
};