import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { softDeleteResource } from '@/hooks/shared/useSoftDelete.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

export const useSoftDeleteOauthAccount = (
  options?: Omit<
    UseMutationOptions<IOauthAccount, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      softDeleteResource<IOauthAccount>(
        `/oauthAccounts/${String(id)}/soft-delete`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
    ...options,
  });
};