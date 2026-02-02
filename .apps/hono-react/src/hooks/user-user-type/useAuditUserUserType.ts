import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createAuditLog } from '@/hooks/shared/useAudit.ts';
import { type IUserUserType } from '@/interfaces/IUserUserType.ts';

interface IAuditLogData {
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  entityId: string | number;
  oldValues?: Partial<IUserUserType>;
  newValues?: Partial<IUserUserType>;
  userId?: string | number;
  metadata?: Record<string, unknown>;
}

export const useAuditUserUserType = (
  options?: Omit<
    UseMutationOptions<unknown, Error, IAuditLogData>,
    'mutationFn'
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      action,
      entityId,
      oldValues,
      newValues,
      userId,
      metadata,
    }: IAuditLogData) =>
      createAuditLog<IUserUserType>(
        '/audit-logs',
        action,
        'userUserType',
        entityId,
        oldValues,
        newValues,
        userId,
        metadata,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    ...options,
  });
};