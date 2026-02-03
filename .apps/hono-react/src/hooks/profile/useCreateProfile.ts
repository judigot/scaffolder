import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createResource } from '@/hooks/shared/useCreate.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

export const useCreateProfile = (
  options?: Omit<
    UseMutationOptions<IProfile, Error, Omit<IProfile, 'id'>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<IProfile, 'id'>) =>
      createResource<IProfile, Omit<IProfile, 'id'>>('/profiles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    ...options,
  });
};