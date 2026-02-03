import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type ISession } from '@/interfaces/ISession.ts';

export const useCreateSession = (
  options?: Omit<
    UseMutationOptions<ISession, Error, Omit<ISession, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<ISession, 'id'>) =>
      createResource<ISession, Omit<ISession, 'id'>>('/sessions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    ...options,
  });
};