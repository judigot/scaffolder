import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestUsers = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IUser[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IUser>('/users/oldest', params.limit, params.filters),
    ...options,
  });
};