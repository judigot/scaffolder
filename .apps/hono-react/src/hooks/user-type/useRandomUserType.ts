import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomUserTypes = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userTypes', 'random', params.limit],
    queryFn: () =>
      getRandomResources<IUserType>('/userTypes/random', params.limit),
    ...options,
  });
};
