import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { existsResource } from '@/hooks/shared/useExists.ts';

interface IExistsParams {
  criteria: Record<string, unknown>;
}

export const useExistsUser = (
  params: IExistsParams,
  options?: Omit<UseQueryOptions<boolean, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['users', 'exists', params.criteria],
    queryFn: () => existsResource('/users/exists', params.criteria),
    enabled: Boolean(
      params.criteria && Object.keys(params.criteria).length > 0,
    ),
    ...options,
  });
};