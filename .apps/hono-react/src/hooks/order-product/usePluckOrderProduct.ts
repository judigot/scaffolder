import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { pluckResources } from '@/hooks/shared/usePluck.ts';

interface IPluckParams {
  column: string;
  key?: string;
}

export const usePluckOrderProducts = (
  params: IPluckParams,
  options?: Omit<UseQueryOptions<(string | number)[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['orderProducts', 'pluck', params.column, params.key],
    queryFn: () =>
      pluckResources('/orderProducts/pluck', params.column, params.key),
    ...options,
  });
};