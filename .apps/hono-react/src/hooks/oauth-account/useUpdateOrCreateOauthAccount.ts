import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IOauthAccount>;
  data: Omit<IOauthAccount, 'id'>;
}

export const useUpdateOrCreateOauthAccount = (
  options?: Omit<
    UseMutationOptions<IOauthAccount, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IOauthAccount, Omit<IOauthAccount, 'id'>>(
        '/oauthAccounts/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
    },
    ...options,
  });
};