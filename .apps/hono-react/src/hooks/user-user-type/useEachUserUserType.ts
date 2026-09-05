import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { eachResource } from '@/hooks/shared/useEach.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IEachParams {
  batchSize?: number;
  filters?: Record<string, unknown>;
  callback: (item: IUserUserType) => void | Promise<void>;
}

export const useEachUserUserTypes = (
  options?: Omit<UseMutationOptions<void, Error, IEachParams>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchSize, filters, callback }: IEachParams) =>
      eachResource<IUserUserType>(
        '/userUserTypes/each',
        callback,
        batchSize,
        filters,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userUserTypes'] });
    },
    ...options,
  });
};