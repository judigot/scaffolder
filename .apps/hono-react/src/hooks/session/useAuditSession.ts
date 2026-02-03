import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createAuditLog } from '@/hooks/shared/useAudit.ts';
import { type ISession } from '@/interfaces/ISession.ts';

interface IAuditLogData {
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  entityId: string | number;
  oldValues?: Partial<ISession>;
  newValues?: Partial<ISession>;
  userId?: string | number;
  metadata?: Record<string, unknown>;
}

export const useAuditSession = (
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
      createAuditLog<ISession>(
        '/audit-logs',
        action,
        'session',
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