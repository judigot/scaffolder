import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { eachResource } from '@/hooks/shared/useEach.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IEachParams {
  batchSize?: number;
  filters?: Record<string, unknown>;
  callback: (item: IProduct) => void | Promise<void>;
}

export const useEachProducts = (
  options?: Omit<UseMutationOptions<void, Error, IEachParams>, 'mutationFn'>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchSize, filters, callback }: IEachParams) =>
      eachResource<IProduct>('/products/each', callback, batchSize, filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    ...options,
  });
};