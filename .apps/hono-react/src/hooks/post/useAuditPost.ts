import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createAuditLog } from '@/hooks/shared/useAudit.ts';
import { type IPost } from '@/interfaces/IPost.ts';

interface IAuditLogData {
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  entityId: string | number;
  oldValues?: Partial<IPost>;
  newValues?: Partial<IPost>;
  userId?: string | number;
  metadata?: Record<string, unknown>;
}

export const useAuditPost = (
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
      createAuditLog<IPost>(
        '/audit-logs',
        action,
        'post',
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