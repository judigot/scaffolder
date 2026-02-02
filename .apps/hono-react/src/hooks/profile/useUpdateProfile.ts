import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useUpdate } from '@/hooks/shared/useUpdate.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

export const useUpdateProfile = (
  id: number | string,
  options?: Omit<
    UseMutationOptions<IProfile, Error, Partial<IProfile>>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IProfile>) =>
      useUpdate<IProfile, Partial<IProfile>>('/profiles', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', id] });
    },
    ...options,
  });
};