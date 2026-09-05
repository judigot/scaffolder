import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IProfile } from '@/interfaces/IProfile.ts';

interface IValidationData {
  data: Partial<IProfile>;
  rules?: Record<string, unknown>;
}

export const useValidateProfile = (
  options?: Omit<
    UseMutationOptions<IProfile, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IProfile>('/profiles', data, rules),
    ...options,
  });
};