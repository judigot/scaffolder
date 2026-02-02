import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInUserUserTypes = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userUserTypes', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IUserUserType>(
        '/userUserTypes/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};
