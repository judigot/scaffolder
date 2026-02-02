import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { eachResource } from '@/hooks/shared/useEach.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IEachParams {
  batchSize?: number;
  filters?: Record<string, unknown>;
  callback: (item: IOrderProduct) => void | Promise<void>;
}

export const useEachOrderProducts = (
  options?: Omit<UseMutationOptions<void, Error, IEachParams>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchSize, filters, callback }: IEachParams) =>
      eachResource<IOrderProduct>(
        '/orderProducts/each',
        callback,
        batchSize,
        filters,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
    ...options,
  });
};