import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

export const useFindOrFailProfile = (
  id: string | number,
  options?: Omit<UseQueryOptions<IProfile, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['profiles', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IProfile>(`/profiles/${String(id)}/find-or-fail`),
    enabled: Boolean(id),
    ...options,
  });
};