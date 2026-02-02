import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { restoreResource } from '@/hooks/shared/useRestore.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

export const useRestoreOauthAccount = (
  options?: Omit<
    UseMutationOptions<IOauthAccount, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      restoreResource<IOauthAccount>(`/oauthAccounts/${String(id)}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
    ...options,
  });
};