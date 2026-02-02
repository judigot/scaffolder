import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { orderByResources } from '@/hooks/shared/useOrderBy.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IOrderByParams {
  column: string;
  direction?: 'asc' | 'desc';
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOrderByUserUserTypes = (
  params: IOrderByParams,
  options?: Omit<UseQueryOptions<IUserUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'orderBy',
      params.column,
      params.direction,
      params.limit,
      params.filters,
    ],
    queryFn: () =>
      orderByResources<IUserUserType>(
        '/userUserTypes/order-by',
        params.column,
        params.direction,
        params.limit,
        params.filters,
      ),
    enabled: Boolean(params.column),
    ...options,
  });
};