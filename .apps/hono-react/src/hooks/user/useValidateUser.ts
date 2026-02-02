import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IValidationData {
  data: Partial<IUser>;
  rules?: Record<string, unknown>;
}

export const useValidateUser = (
  options?: Omit<
    UseMutationOptions<IUser, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IUser>('/users', data, rules),
    ...options,
  });
};