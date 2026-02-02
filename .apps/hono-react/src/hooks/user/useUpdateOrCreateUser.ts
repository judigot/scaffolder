import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IUser>;
  data: Omit<IUser, 'id'>;
}

export const useUpdateOrCreateUser = (
  options?: Omit<
    UseMutationOptions<IUser, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IUser, Omit<IUser, 'id'>>(
        '/users/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options,
  });
};