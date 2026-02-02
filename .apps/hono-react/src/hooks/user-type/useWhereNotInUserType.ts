import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInUserTypes = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userTypes', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IUserType>(
        '/userTypes/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};