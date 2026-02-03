import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { batchUpdateResources } from '@/hooks/shared/useBatchUpdate.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IBatchUpdateData {
  ids: (number | string)[];
  data: Partial<ISession>;
}

export const useBatchUpdateSessions = (
  options?: Omit<
    UseMutationOptions<ISession[], Error, IBatchUpdateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: IBatchUpdateData) =>
      batchUpdateResources<ISession, Partial<ISession>>(
        '/sessions/batch-update',
        ids,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    ...options,
  });
};