import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomProfiles = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IProfile[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['profiles', 'random', params.limit],
    queryFn: () =>
      getRandomResources<IProfile>('/profiles/random', params.limit),
    ...options,
  });
};