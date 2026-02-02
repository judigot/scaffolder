import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IUser } from '@/interfaces/IUser.ts';

export const useCreateUser = (
  options?: Omit<
    UseMutationOptions<IUser, Error, Omit<IUser, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUser, 'id'>) =>
      createResource<IUser, Omit<IUser, 'id'>>('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};