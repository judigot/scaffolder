import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type ISession } from '@/interfaces/ISession.ts';

export const useUpdateSession = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<ISession, Error, Partial<ISession>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ISession>) =>
      useUpdate<ISession, Partial<ISession>>('/sessions', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
    ...options,
  });
};
