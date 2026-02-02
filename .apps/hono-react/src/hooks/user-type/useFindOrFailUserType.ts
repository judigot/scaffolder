import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { findOrFailResource } from '@/hooks/shared/useFindOrFail.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

export const useFindOrFailUserType = (
  id: string | number,
  options?: Omit<UseQueryOptions<IUserType, Error>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery({
    queryKey: ['userTypes', 'findOrFail', id],
    queryFn: () =>
      findOrFailResource<IUserType>(`/userTypes/${String(id)}/find-or-fail`),
    enabled: Boolean(id),
    ...options,
  });
};