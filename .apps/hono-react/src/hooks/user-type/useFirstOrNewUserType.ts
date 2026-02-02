import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IUserType>;
  defaults?: Partial<IUserType>;
}

export const useFirstOrNewUserType = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IUserType, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userTypes',
      'firstOrNew',
      params.searchCriteria,
      params.defaults,
    ],
    queryFn: () =>
      firstOrNewResource<IUserType>(
        '/userTypes/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};
