import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

export const useUpdateUserUserType = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IUserUserType, Error, Partial<IUserUserType>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IUserUserType>) =>
      useUpdate<IUserUserType, Partial<IUserUserType>>(
        '/userUserTypes',
        id,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
      queryClient.invalidateQueries({ queryKey: ['userUserType', id] });
    },
    ...options,
  });
};