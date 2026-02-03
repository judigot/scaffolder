import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<IOrderProduct>;
  defaults?: Partial<IOrderProduct>;
}

export const useFirstOrCreateOrderProduct = (
  options?: Omit<
    UseMutationOptions<IOrderProduct, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<IOrderProduct>(
        '/orderProducts/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderProducts'] });
    },
    ...options,
  });
};