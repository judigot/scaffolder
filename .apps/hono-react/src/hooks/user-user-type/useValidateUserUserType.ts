import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IValidationData {
  data: Partial<IUserUserType>;
  rules?: Record<string, unknown>;
}

export const useValidateUserUserType = (
  options?: Omit<
    UseMutationOptions<IUserUserType, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IUserUserType>('/userUserTypes', data, rules),
    ...options,
  });
};
