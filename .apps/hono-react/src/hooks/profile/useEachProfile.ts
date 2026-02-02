import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { eachResource } from '@/hooks/shared/useEach.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IEachParams {
  batchSize?: number;
  filters?: Record<string, unknown>;
  callback: (item: IProfile) => void | Promise<void>;
}

export const useEachProfiles = (
  options?: Omit<UseMutationOptions<void, Error, IEachParams>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchSize, filters, callback }: IEachParams) =>
      eachResource<IProfile>('/profiles/each', callback, batchSize, filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    ...options,
  });
};