import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

export const useCreateUserType = (
  options?: Omit<
    UseMutationOptions<IUserType, Error, Omit<IUserType, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUserType, 'id'>) =>
      createResource<IUserType, Omit<IUserType, 'id'>>('/userTypes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
    },
    ...options,
  });
};
