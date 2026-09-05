import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { softDeleteResource } from '@/hooks/shared/useSoftDelete.ts';
import { type IUser } from '@/interfaces/IUser.ts';

export const useSoftDeleteUser = (
  options?: Omit<
    UseMutationOptions<IUser, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      softDeleteResource<IUser>(`/users/${String(id)}/soft-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};