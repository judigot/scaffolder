import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Logs an audit entry for data changes
 * @param endpoint The API endpoint for audit logging
 * @param action The action performed (create, update, delete, etc.)
 * @param entityType The type of entity being tracked
 * @param entityId The ID of the entity
 * @param oldValues The previous values (for updates)
 * @param newValues The new values
 * @param userId The ID of the user performing the action
 * @param metadata Additional metadata (IP address, user agent, etc.)
 * @returns Promise resolving to the audit log entry
 */
export const createAuditLog = async <T>(
  endpoint: string,
  action: 'create' | 'update' | 'delete' | 'view' | 'export',
  entityType: string,
  entityId: string | number,
  oldValues?: Partial<T>,
  newValues?: Partial<T>,
  userId?: string | number,
  metadata?: Record<string, unknown>,
): Promise<unknown> => {
  try {
    const auditEntry = {
      action,
      entityType,
      entityId: String(entityId),
      oldValues: oldValues || null,
      newValues: newValues || null,
      userId: userId || null,
      timestamp: new Date().toISOString(),
      metadata: {
        userAgent:
          typeof window !== 'undefined' ? window.navigator.userAgent : null,
        ...metadata,
      },
    };

    const response = await axiosInstance.post(endpoint, auditEntry);
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to create audit log');
  }
};