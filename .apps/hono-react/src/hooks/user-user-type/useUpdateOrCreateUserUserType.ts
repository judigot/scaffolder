import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IUserUserType>;
  data: Omit<IUserUserType, 'id'>;
}

export const useUpdateOrCreateUserUserType = (
  options?: Omit<
    UseMutationOptions<IUserUserType, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IUserUserType, Omit<IUserUserType, 'id'>>(
        '/userUserTypes/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
    ...options,
  });
};