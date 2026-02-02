import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IUserType>;
  defaults?: Partial<IUserType>;
}

export const useFirstOrCreateUserType = (
  options?: Omit<
    UseMutationOptions<IUserType, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IUserType>(
        '/userTypes/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
    },
    ...options,
  });
};
