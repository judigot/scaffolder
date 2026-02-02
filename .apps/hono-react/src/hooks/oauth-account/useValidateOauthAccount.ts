import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IValidationData {
  data: Partial<IOauthAccount>;
  rules?: Record<string, unknown>;
}

export const useValidateOauthAccount = (
  options?: Omit<
    UseMutationOptions<IOauthAccount, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IOauthAccount>('/oauthAccounts', data, rules),
    ...options,
  });
};