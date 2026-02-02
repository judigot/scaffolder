import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IOrderProduct } from '@/interfaces/IOrderProduct.ts';

interface IValidationData {
  data: Partial<IOrderProduct>;
  rules?: Record<string, unknown>;
}

export const useValidateOrderProduct = (
  options?: Omit<
    UseMutationOptions<IOrderProduct, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IOrderProduct>('/orderProducts', data, rules),
    ...options,
  });
};