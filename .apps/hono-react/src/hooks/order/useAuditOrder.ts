import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createAuditLog } from '@/hooks/shared/useAudit.ts';
import { type IOrder } from '@/interfaces/IOrder.ts';

interface IAuditLogData {
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  entityId: string | number;
  oldValues?: Partial<IOrder>;
  newValues?: Partial<IOrder>;
  userId?: string | number;
  metadata?: Record<string, unknown>;
}

export const useAuditOrder = (
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
      createAuditLog<IOrder>(
        '/audit-logs',
        action,
        'order',
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