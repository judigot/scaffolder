import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeleteOauthAccount = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/oauthAccounts', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['oauthAccounts'] });
      queryClient.removeQueries({ queryKey: ['oauthAccount', id] });
    },
    ...options,
  });
};