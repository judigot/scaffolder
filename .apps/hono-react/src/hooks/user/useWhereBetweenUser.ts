import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereBetweenResources } from '@/hooks/shared/useWhereBetween.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IWhereBetweenParams {
  column: string;
  min: string | number;
  max: string | number;
}

export const useWhereBetweenUsers = (
  params: IWhereBetweenParams,
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'whereBetween', params.column, params.min, params.max],
    queryFn: () =>
      whereBetweenResources<IUser>(
        '/users/where-between',
        params.column,
        params.min,
        params.max,
      ),
    ...options,
  });
};