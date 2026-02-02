import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { orderByResources } from '@/hooks/shared/useOrderBy.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IOrderByParams {
  column: string;
  direction?: 'asc' | 'desc';
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOrderBySessions = (
  params: IOrderByParams,
  options?: Omit<UseQueryOptions<ISession[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'sessions',
      'orderBy',
      params.column,
      params.direction,
      params.limit,
      params.filters,
    ],
    queryFn: () =>
      orderByResources<ISession>(
        '/sessions/order-by',
        params.column,
        params.direction,
        params.limit,
        params.filters,
      ),
    enabled: Boolean(params.column),
    ...options,
  });
};
