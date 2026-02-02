import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { softDeleteResource } from '@/hooks/shared/useSoftDelete.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

export const useSoftDeleteProfile = (
  options?: Omit<
    UseMutationOptions<IProfile, Error, string | number>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) =>
      softDeleteResource<IProfile>(`/profiles/${String(id)}/soft-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    ...options,
  });
};