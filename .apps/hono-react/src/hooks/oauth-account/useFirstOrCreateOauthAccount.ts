import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IOauthAccount>;
  defaults?: Partial<IOauthAccount>;
}

export const useFirstOrCreateOauthAccount = (
  options?: Omit<
    UseMutationOptions<IOauthAccount, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IOauthAccount>(
        '/oauthAccounts/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
    ...options,
  });
};
