import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestUsers = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IUser>('/users/latest', params.limit, params.filters),
    ...options,
  });
};