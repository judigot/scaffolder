import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IProfile>;
  defaults?: Partial<IProfile>;
}

export const useFirstOrCreateProfile = (
  options?: Omit<
    UseMutationOptions<IProfile, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IProfile>(
        '/profiles/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    ...options,
  });
};