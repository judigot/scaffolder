import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IProduct } from '@/interfaces/IProduct.ts';

interface IValidationData {
  data: Partial<IProduct>;
  rules?: Record<string, unknown>;
}

export const useValidateProduct = (
  options?: Omit<
    UseMutationOptions<IProduct, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IProduct>('/products', data, rules),
    ...options,
  });
};