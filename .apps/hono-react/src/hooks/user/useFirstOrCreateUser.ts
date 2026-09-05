import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IUser>;
  defaults?: Partial<IUser>;
}

export const useFirstOrCreateUser = (
  options?: Omit<
    UseMutationOptions<IUser, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IUser>(
        '/users/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};