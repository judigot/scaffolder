import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<ISession>;
  defaults?: Partial<ISession>;
}

export const useFirstOrCreateSession = (
  options?: Omit<
    UseMutationOptions<ISession, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<ISession>(
        '/sessions/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    ...options,
  });
};
