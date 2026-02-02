import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<ISession>;
  data: Omit<ISession, 'id'>;
}

export const useUpdateOrCreateSession = (
  options?: Omit<
    UseMutationOptions<ISession, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<ISession, Omit<ISession, 'id'>>(
        '/sessions/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    ...options,
  });
};