import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { createAuditLog } from '@/hooks/shared/useAudit.ts';
import { type IOauthAccount } from '@/interfaces/IOauthAccount.ts';

interface IAuditLogData {
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  entityId: string | number;
  oldValues?: Partial<IOauthAccount>;
  newValues?: Partial<IOauthAccount>;
  userId?: string | number;
  metadata?: Record<string, unknown>;
}

export const useAuditOauthAccount = (
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
      createAuditLog<IOauthAccount>(
        '/audit-logs',
        action,
        'oauthAccount',
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
