import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInPosts = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IPost[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IPost>(
        '/posts/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};