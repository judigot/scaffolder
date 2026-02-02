import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInUsers = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IUser>(
        '/users/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};