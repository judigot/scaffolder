import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<IOauthAccount>;
}

export const useBatchUpdateOauthAccounts = (
  options?: Omit<
    UseMutationOptions<IOauthAccount[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<IOauthAccount, Partial<IOauthAccount>>(
        '/oauthAccounts/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
    ...options,
  });
};
