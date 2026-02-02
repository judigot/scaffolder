import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IUserUserType>;
  defaults?: Partial<IUserUserType>;
}

export const useFirstOrCreateUserUserType = (
  options?: Omit<
    UseMutationOptions<IUserUserType, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IUserUserType>(
        '/userUserTypes/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
    ...options,
  });
};
