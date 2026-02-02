import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IUserType>;
  data: Omit<IUserType, 'id'>;
}

export const useUpdateOrCreateUserType = (
  options?: Omit<
    UseMutationOptions<IUserType, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IUserType, Omit<IUserType, 'id'>>(
        '/userTypes/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userTypes'] });
    },
    ...options,
  });
};