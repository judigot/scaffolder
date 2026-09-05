import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';

/**
 * Validates and sanitizes data before sending to API
 * @param endpoint The API endpoint for validation
 * @param data The data to validate
 * @param validationRules Optional validation rules to apply
 * @returns Promise resolving to validated and sanitized data
 */
export const validateAndSanitize = async <T>(
  endpoint: string,
  data: T,
  validationRules?: Record<string, unknown>,
): Promise<T> => {
  try {
    const response = await axiosInstance.post(`${endpoint}/validate`, {
      data,
      rules: validationRules,
    });
    return response.data.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to validate data');
  }
};

/**
 * Checks if user has permission to perform action on entity
 * @param endpoint The API endpoint for permission check
 * @param action The action to check permission for
 * @param entityType The type of entity
 * @param entityId The ID of the entity (optional for create operations)
 * @param userId The ID of the user
 * @returns Promise resolving to permission result
 */
export const checkPermission = async (
  endpoint: string,
  action: 'create' | 'read' | 'update' | 'delete',
  entityType: string,
  entityId?: string | number,
  userId?: string | number,
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const response = await axiosInstance.post(`${endpoint}/check-permission`, {
      action,
      entityType,
      entityId,
      userId,
    });
    return response.data;
  } catch (error: unknown) {
    handleError(error, 'Failed to check permissions');
    return { allowed: false, reason: 'Permission check failed' };
  }
};