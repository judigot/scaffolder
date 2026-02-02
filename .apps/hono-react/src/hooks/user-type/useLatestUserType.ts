import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestUserTypes = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userTypes', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IUserType>(
        '/userTypes/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};
