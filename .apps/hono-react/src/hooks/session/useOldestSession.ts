import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestSessions = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['sessions', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<ISession>(
        '/sessions/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};
