import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

export const useCreateOauthAccount = (
  options?: Omit<
    UseMutationOptions<IOauthAccount, Error, Omit<IOauthAccount, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IOauthAccount, 'id'>) =>
      createResource<IOauthAccount, Omit<IOauthAccount, 'id'>>(
        '/oauthAccounts',
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
    ...options,
  });
};
