import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestSessions = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['sessions', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<ISession>(
        '/sessions/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};
