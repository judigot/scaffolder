import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { firstOrNewResource } from '@/hooks/shared/useFirstOrNew.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IFirstOrNewParams {
  searchCriteria: Partial<IProfile>;
  defaults?: Partial<IProfile>;
}

export const useFirstOrNewProfile = (
  params: IFirstOrNewParams,
  options?: Omit<UseQueryOptions<IProfile, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'profiles',
      'firstOrNew',
      params.searchCriteria,
      params.defaults,
    ],
    queryFn: () =>
      firstOrNewResource<IProfile>(
        '/profiles/first-or-new',
        params.searchCriteria,
        params.defaults,
      ),
    ...options,
  });
};