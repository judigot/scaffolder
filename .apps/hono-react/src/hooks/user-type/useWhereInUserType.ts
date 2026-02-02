import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInUserTypes = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userTypes', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IUserType>(
        '/userTypes/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};