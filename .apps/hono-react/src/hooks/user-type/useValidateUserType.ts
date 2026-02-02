import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IUserType } from '@/interfaces/IUserType.ts';

interface IValidationData {
  data: Partial<IUserType>;
  rules?: Record<string, unknown>;
}

export const useValidateUserType = (
  options?: Omit<
    UseMutationOptions<IUserType, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IUserType>('/userTypes', data, rules),
    ...options,
  });
};