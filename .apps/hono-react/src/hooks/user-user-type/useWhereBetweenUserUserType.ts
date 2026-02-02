import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereBetweenResources } from '@/hooks/shared/useWhereBetween.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IWhereBetweenParams {
  column: string;
  min: string | number;
  max: string | number;
}

export const useWhereBetweenUserUserTypes = (
  params: IWhereBetweenParams,
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'whereBetween',
      params.column,
      params.min,
      params.max,
    ],
    queryFn: () =>
      whereBetweenResources<IUserUserType>(
        '/userUserTypes/where-between',
        params.column,
        params.min,
        params.max,
      ),
    ...options,
  });
};
