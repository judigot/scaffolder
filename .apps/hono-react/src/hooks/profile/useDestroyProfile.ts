import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { deleteResource } from '@/hooks/shared/useDestroy.ts';

export const useDeleteProfile = (
  options?: Omit<
    UseMutationOptions<void, Error, number | string>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteResource('/profiles', id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.removeQueries({ queryKey: ['profile', id] });
    },
    ...options,
  });
};