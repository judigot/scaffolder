import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type ISession } from '@/interfaces/ISession.ts';

export const useFindOrFailSession = (
  id: string | number,
  options?: Omit<UseQueryOptions<ISession, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['sessions', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<ISession>(`/sessions/${String(id)}/find-or-fail`),
    enabled: Boolean(id),
    ...options,
  });
};
