import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { exportData } from '@/hooks/shared/useExport.ts';
import { type IUser } from '@/interfaces/IUser.ts';

interface IExportData {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  filters?: Record<string, unknown>;
  columns?: string[];
  filename?: string;
}

export const useExportUser = (
  options?: Omit<
    UseMutationOptions<{ url: string; filename: string }, Error, IExportData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ format, filters, columns, filename }: IExportData) =>
      exportData<IUser>('/users', format, filters, columns, {
        skipPermissionCheck: false,
        skipAudit: false,
        userId: undefined, // Will be set from auth context
        filename,
      }),
    onSuccess: () => {
      // Optional: invalidate related queries
    },
    ...options,
  });
};