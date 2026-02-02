import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

export const useCreateUserUserType = (
  options?: Omit<
    UseMutationOptions<IUserUserType, Error, Omit<IUserUserType, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IUserUserType, 'id'>) =>
      createResource<IUserUserType, Omit<IUserUserType, 'id'>>(
        '/userUserTypes',
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
    ...options,
  });
};