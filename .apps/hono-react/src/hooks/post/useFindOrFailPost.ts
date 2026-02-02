import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IPost } from '@/interfaces/IPost.ts';

export const useFindOrFailPost = (
  id: string | number,
  options?: Omit<UseQueryOptions<IPost, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['posts', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IPost>(`/posts/${String(id)}/find-or-fail`),
    enabled: Boolean(id),
    ...options,
  });
};