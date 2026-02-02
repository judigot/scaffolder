import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IPost>;
  defaults?: Partial<IPost>;
}

export const useFirstOrNewPost = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IPost, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'firstOrNew', params.searchCriteria, params.defaults],
    queryFn: () =>
      firstOrNewResource<IPost>(
        '/posts/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};