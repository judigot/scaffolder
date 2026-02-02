import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IValidationData {
  data: Partial<IOrder>;
  rules?: Record<string, unknown>;
}

export const useValidateOrder = (
  options?: Omit<
    UseMutationOptions<IOrder, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IOrder>('/orders', data, rules),
    ...options,
  });
};