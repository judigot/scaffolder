import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IUserType>;
}

export const useBatchUpdateUserTypes = (
  options?: Omit<
    UseMutationOptions<IUserType[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IUserType, Partial<IUserType>>(
        '/userTypes/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
    },
    ...options,
  });
};
