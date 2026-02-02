import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<IOrderProduct>;
  data: Omit<IOrderProduct, 'id'>;
}

export const useUpdateOrCreateOrderProduct = (
  options?: Omit<
    UseMutationOptions<IOrderProduct, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<IOrderProduct, Omit<IOrderProduct, 'id'>>(
        '/orderProducts/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
    ...options,
  });
};