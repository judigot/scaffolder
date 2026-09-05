import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IUser>;
}

export const useBatchUpdateUsers = (
  options?: Omit<
    UseMutationOptions<IUser[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IUser, Partial<IUser>>(
        '/users/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};