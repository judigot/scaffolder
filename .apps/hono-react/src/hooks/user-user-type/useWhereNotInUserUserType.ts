import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInUserUserTypes = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userUserTypes', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IUserUserType>(
        '/userUserTypes/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};