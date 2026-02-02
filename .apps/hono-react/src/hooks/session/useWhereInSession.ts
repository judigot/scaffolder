import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInSessions = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['sessions', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<ISession>(
        '/sessions/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};
