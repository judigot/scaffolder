import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type ICustomer } from '@/interfaces/ICustomer.ts';

interface IValidationData {
  data: Partial<ICustomer>;
  rules?: Record<string, unknown>;
}

export const useValidateCustomer = (
  options?: Omit<
    UseMutationOptions<ICustomer, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<ICustomer>('/customers', data, rules),
    ...options,
  });
};