import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

export const useFindOrFailUserUserType = (
  id: string | number,
  options?: Omit<UseQueryOptions<IUserUserType, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userUserTypes', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IUserUserType>(
        `/userUserTypes/${String(id)}/find-or-fail`,
      ),
    enabled: Boolean(id),
    ...options,
  });
};