import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

export const useUpdateUserType = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IUserType, Error, Partial<IUserType>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IUserType>) =>
      useUpdate<IUserType, Partial<IUserType>>('/userTypes', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
      queryClient.invalidateQueries({ queryKey: ['userType', id] });
    },
    ...options,
  });
};
