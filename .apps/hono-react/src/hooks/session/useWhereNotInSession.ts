import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInSessions = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['sessions', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<ISession>(
        '/sessions/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};
