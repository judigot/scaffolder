import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<ISession>;
  defaults?: Partial<ISession>;
}

export const useFirstOrNewSession = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<ISession, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'sessions',
      'firstOrNew',
      params.searchCriteria,
      params.defaults,
    ],
    queryFn: () =>
      firstOrNewResource<ISession>(
        '/sessions/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};
