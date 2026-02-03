import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IProfile>;
  data: Omit<IProfile, 'id'>;
}

export const useUpdateOrCreateProfile = (
  options?: Omit<
    UseMutationOptions<IProfile, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IProfile, Omit<IProfile, 'id'>>(
        '/profiles/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    ...options,
  });
};