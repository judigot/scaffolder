import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IUser } from '@/interfaces/IUser.ts';

export const useFindOrFailUser = (
  id: string | number,
  options?: Omit<UseQueryOptions<IUser, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IUser>(`/users/${String(id)}/find-or-fail`),
    enabled: Boolean(id),
    ...options,
  });
};