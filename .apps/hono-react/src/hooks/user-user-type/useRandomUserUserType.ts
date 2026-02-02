import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRandomResources } from '@/hooks/shared/useRandom.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IRandomParams {
  limit?: number;
}

export const useRandomUserUserTypes = (
  params: IRandomParams = {},
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userUserTypes', 'random', params.limit],
    queryFn: () =>
      getRandomResources<IUserUserType>('/userUserTypes/random', params.limit),
    ...options,
  });
};
