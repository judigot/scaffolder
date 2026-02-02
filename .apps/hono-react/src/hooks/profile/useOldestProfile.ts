import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getOldestResources } from '@/hooks/shared/useOldest.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IOldestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOldestProfiles = (
  params: IOldestParams = {},
  options?: Omit<UseQueryOptions<IProfile[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['profiles', 'oldest', params.limit, params.filters],
    queryFn: () =>
      getOldestResources<IProfile>(
        '/profiles/oldest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};