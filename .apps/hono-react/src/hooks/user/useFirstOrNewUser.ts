import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IUser>;
  defaults?: Partial<IUser>;
}

export const useFirstOrNewUser = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IUser, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'firstOrNew', params.searchCriteria, params.defaults],
    queryFn: () =>
      firstOrNewResource<IUser>(
        '/users/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};