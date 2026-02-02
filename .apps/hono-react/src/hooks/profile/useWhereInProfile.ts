import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { whereInResources } from '@/hooks/shared/useWhereIn.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IWhereInParams {
  column: string;
  values: (string | number)[];
}

export const useWhereInProfiles = (
  params: IWhereInParams,
  options?: Omit<UseQueryOptions<IProfile[]>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['profiles', 'whereIn', params.column, params.values],
    queryFn: () =>
      whereInResources<IProfile>(
        '/profiles/where-in',
        params.column,
        params.values,
      ),
    ...options,
  });
};