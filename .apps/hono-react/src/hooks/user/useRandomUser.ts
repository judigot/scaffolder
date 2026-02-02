import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomUsers = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'random', params.limit],
    queryFn: () => getRandomResources<IUser>('/users/random', params.limit),
    ...options,
  });
};