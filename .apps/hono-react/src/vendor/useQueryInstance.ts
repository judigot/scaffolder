import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/**
 * Generic query instance hook for running standardized queries.
 * @param queryKey Query key or array of keys
 * @param fetcher Async function that returns data
 * @param options Optional react-query settings
 * @returns TanStack Query result of type T
 */
export const useQueryInstance = <T>(
  queryKey: string | unknown[],
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: fetcher,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
};