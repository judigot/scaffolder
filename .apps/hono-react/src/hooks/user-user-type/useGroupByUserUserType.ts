import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { groupByResources } from '@/hooks/shared/useGroupBy.ts';

interface IGroupByParams {
  column: string;
  aggregateFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  aggregateColumn?: string;
  filters?: Record<string, unknown>;
}

interface IGroupByResult {
  [key: string]: unknown;
  count?: number;
  sum?: number;
  avg?: number;
  min?: unknown;
  max?: unknown;
}

export const useGroupByUserUserTypes = (
  params: IGroupByParams,
  options?: Omit<UseQueryOptions<IGroupByResult[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: [
      'userUserTypes',
      'groupBy',
      params.column,
      params.aggregateFunction,
      params.aggregateColumn,
      params.filters,
    ],
    queryFn: () =>
      groupByResources(
        '/userUserTypes/group-by',
        params.column,
        params.aggregateFunction,
        params.aggregateColumn,
        params.filters,
      ),
    enabled: Boolean(params.column),
    ...options,
  });
};