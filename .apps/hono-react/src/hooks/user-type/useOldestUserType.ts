import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestUserTypes = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userTypes', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IUserType>(
        '/userTypes/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};