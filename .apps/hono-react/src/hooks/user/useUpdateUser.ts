import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IUser } from '@/interfaces/IUser.ts';

export const useUpdateUser = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IUser, Error, Partial<IUser>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IUser>) =>
      useUpdate<IUser, Partial<IUser>>('/users', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    },
    ...options,
  });
};