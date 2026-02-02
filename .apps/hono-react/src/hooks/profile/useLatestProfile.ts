import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getLatestResources } from '@/hooks/shared/useLatest.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface ILatestParams {
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useLatestProfiles = (
  params: ILatestParams = {},
  options?: Omit<UseQueryOptions<IProfile[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['profiles', 'latest', params.limit, params.filters],
    queryFn: () =>
      getLatestResources<IProfile>(
        '/profiles/latest',
        params.limit,
        params.filters,
      ),
    ...options,
  });
};