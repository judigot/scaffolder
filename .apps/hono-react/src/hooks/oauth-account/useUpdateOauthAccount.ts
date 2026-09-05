import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

export const useUpdateOauthAccount = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IOauthAccount, Error, Partial<IOauthAccount>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IOauthAccount>) =>
      useUpdate<IOauthAccount, Partial<IOauthAccount>>(
        '/oauthAccounts',
        id,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
      queryClient.invalidateQueries({ queryKey: ['oauthAccount', id] });
    },
    ...options,
  });
};