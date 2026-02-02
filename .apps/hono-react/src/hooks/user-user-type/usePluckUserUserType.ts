import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { pluckResources } from '@/hooks/shared/usePluck.ts';

interface IPluckParams {
  column: string;
  key?: string;
}

export const usePluckUserUserTypes = (
  params: IPluckParams,
  options?: Omit<UseQueryOptions<(string | number)[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userUserTypes', 'pluck', params.column, params.key],
    queryFn: () =>
      pluckResources('/userUserTypes/pluck', params.column, params.key),
    ...options,
  });
};