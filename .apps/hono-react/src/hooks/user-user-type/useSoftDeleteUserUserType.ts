import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { softDeleteResource } from '@/hooks/shared/useSoftDelete.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

export const useSoftDeleteUserUserType = (
  options?: Omit<
    UseMutationOptions<IUserUserType, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      softDeleteResource<IUserUserType>(
        `/userUserTypes/${String(id)}/soft-delete`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
    ...options,
  });
};
