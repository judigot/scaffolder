import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereNotInResources } from '@/hooks/shared/useWhereNotIn.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IWhereNotInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereNotInProfiles = (
  params: IWhereNotInParams,
  options?: Omit<UseQueryOptions<IProfile[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['profiles', 'whereNotIn', params.column, params.values],
    queryFn: () =>
      whereNotInResources<IProfile>(
        '/profiles/where-not-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};