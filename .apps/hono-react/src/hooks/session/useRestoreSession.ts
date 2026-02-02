import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { restoreResource } from '@/hooks/shared/useRestore.ts';
import { type ISession } from '@/interfaces/ISession.ts';

export const useRestoreSession = (
  options?: Omit<
    UseMutationOptions<ISession, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      restoreResource<ISession>(`/sessions/${String(id)}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    ...options,
  });
};
