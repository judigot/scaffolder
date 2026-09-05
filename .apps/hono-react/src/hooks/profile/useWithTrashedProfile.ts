import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getWithTrashedResources } from '@/hooks/shared/useWithTrashed.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IWithTrashedParams {
  filters?: Record<string, unknown>;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export const useWithTrashedProfiles = (
  params: IWithTrashedParams = {},
  options?: Omit<UseQueryOptions<IProfile[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'profiles',
      'withTrashed',
      params.filters,
      params.limit,
      params.orderBy,
      params.orderDirection,
    ],
    queryFn: () =>
      getWithTrashedResources<IProfile>(
        '/profiles/with-trashed',
        params.filters,
        params.limit,
        params.orderBy,
        params.orderDirection,
      ),
    ...options,
  });
};