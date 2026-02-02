import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithoutTrashedResources } from '@/hooks/shared/useWithoutTrashed.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IWithoutTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithoutTrashedSessions = (
  params: IWithoutTrashedParams = {},
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'sessions',
      'withoutTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithoutTrashedResources<ISession>(
        '/sessions/without-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};
