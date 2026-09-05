import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { restoreResource } from '@/hooks/shared/useRestore.ts';
import { type IUser } from '@/interfaces/IUser.ts';

export const useRestoreUser = (
  options?: Omit<
    UseMutationOptions<IUser, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      restoreResource<IUser>(`/users/${String(id)}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};