import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { orderByResources } from '@/hooks/shared/useOrderBy.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IOrderByParams {
  column: string;
  direction?: 'asc' | 'desc';
  limit?: number;
  filters?: Record<string, unknown>;
}

export const useOrderByUserTypes = (
  params: IOrderByParams,
  options?: Omit<UseQueryOptions<IUserType[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userTypes',
      'orderBy',
      params.column,
      params.direction,
      params.limit,
      params.filters,
    ],
    queryFn: () =>
      orderByResources<IUserType>(
        '/userTypes/order-by',
        params.column,
        params.direction,
        params.limit,
        params.filters,
      ),
    enabled: Boolean(params.column),
    ...options,
  });
};
