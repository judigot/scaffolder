import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { firstOrCreateResource } from '@/hooks/shared/useFirstOrCreate.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IFirstOrCreateData {
  searchCriteria: Partial<ICustomer>;
  defaults?: Partial<ICustomer>;
}

export const useFirstOrCreateCustomer = (
  options?: Omit<
    UseMutationOptions<ICustomer, Error, IFirstOrCreateData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ searchCriteria, defaults }: IFirstOrCreateData) =>
      firstOrCreateResource<ICustomer>(
        '/customers/first-or-create',
        searchCriteria,
        defaults,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    ...options,
  });
};