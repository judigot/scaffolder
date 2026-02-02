import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IUserUserType>;
  defaults?: Partial<IUserUserType>;
}

export const useFirstOrNewUserUserType = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IUserUserType, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'firstOrNew',
      params.searchCriteria,
      params.defaults,
    ],
    queryFn: () =>
      firstOrNewResource<IUserUserType>(
        '/userUserTypes/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};
