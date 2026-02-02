import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomSessions = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['sessions', 'random', params.limit],
    queryFn: () =>
      getRandomResources<ISession>('/sessions/random', params.limit),
    ...options,
  });
};
