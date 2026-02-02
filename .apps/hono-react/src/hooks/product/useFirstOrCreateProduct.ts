import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IProduct>;
  defaults?: Partial<IProduct>;
}

export const useFirstOrCreateProduct = (
  options?: Omit<
    UseMutationOptions<IProduct, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IProduct>(
        '/products/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    ...options,
  });
};