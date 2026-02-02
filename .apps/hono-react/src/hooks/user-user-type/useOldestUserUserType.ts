import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestUserUserTypes = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userUserTypes', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IUserUserType>(
        '/userUserTypes/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};
