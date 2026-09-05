import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IProduct>;
  data: Omit<IProduct, 'id'>;
}

export const useUpdateOrCreateProduct = (
  options?: Omit<
    UseMutationOptions<IProduct, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IProduct, Omit<IProduct, 'id'>>(
        '/products/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    ...options,
  });
};