import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IValidationData {
  data: Partial<ISession>;
  rules?: Record<string, unknown>;
}

export const useValidateSession = (
  options?: Omit<
    UseMutationOptions<ISession, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<ISession>('/sessions', data, rules),
    ...options,
  });
};