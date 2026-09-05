import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { validateAndSanitize } from '@/hooks/shared/useValidate.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IValidationData {
  data: Partial<IPost>;
  rules?: Record<string, unknown>;
}

export const useValidatePost = (
  options?: Omit<
    UseMutationOptions<IPost, Error, IValidationData>,
    'mutationFn'
  >,
) => {
  return useMutation({
    mutationFn: ({ data, rules }: IValidationData) =>
      validateAndSanitize<IPost>('/posts', data, rules),
    ...options,
  });
};