import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInUsers = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IUser>('/users/where-in', params.column, params.values),
    ...options,
  });
};