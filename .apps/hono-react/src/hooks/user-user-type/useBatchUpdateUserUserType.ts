import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IUserUserType>;
}

export const useBatchUpdateUserUserTypes = (
  options?: Omit<
    UseMutationOptions<IUserUserType[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IUserUserType, Partial<IUserUserType>>(
        '/userUserTypes/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
    ...options,
  });
};