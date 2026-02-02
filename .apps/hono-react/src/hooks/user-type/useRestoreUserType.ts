import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { restoreResource } from '@/hooks/shared/useRestore.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

export const useRestoreUserType = (
  options?: Omit<
    UseMutationOptions<IUserType, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      restoreResource<IUserType>(`/userTypes/${String(id)}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
    },
    ...options,
  });
};
