import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestUserUserTypes = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userUserTypes', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IUserUserType>(
        '/userUserTypes/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};