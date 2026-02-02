import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { softDeleteResource } from '@/hooks/shared/useSoftDelete.ts';
import { type ISession } from '@/interfaces/ISession.ts';

export const useSoftDeleteSession = (
  options?: Omit<
    UseMutationOptions<ISession, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      softDeleteResource<ISession>(`/sessions/${String(id)}/soft-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    ...options,
  });
};