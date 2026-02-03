import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IProfile>;
}

export const useBatchUpdateProfiles = (
  options?: Omit<
    UseMutationOptions<IProfile[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IProfile, Partial<IProfile>>(
        '/profiles/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    ...options,
  });
};