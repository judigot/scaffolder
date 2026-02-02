import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { updateOrCreateResource } from '@/hooks/shared/useUpdateOrCreate.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IUpdateOrCreateData {
  searchCriteria: Partial<ICustomer>;
  data: Omit<ICustomer, 'id'>;
}

export const useUpdateOrCreateCustomer = (
  options?: Omit<
    UseMutationOptions<ICustomer, Error, IUpdateOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, data }: IUpdateOrCreateData) =>
      updateOrCreateResource<ICustomer, Omit<ICustomer, 'id'>>(
        '/customers/update-or-create',
        searchCriteria,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    ...options,
  });
};