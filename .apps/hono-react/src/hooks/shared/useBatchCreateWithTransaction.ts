import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';
import {
  validateAndSanitize,
  checkPermission,
} from '@/hooks/shared/useValidation.ts';
import { createAuditLog } from '@/hooks/shared/useAudit.ts';

/**
 * Creates multiple resources in a single transaction with enterprise-grade features
 * @param endpoint The API endpoint
 * @param dataArray Array of resource data to create
 * @param options Enterprise options (validation, audit, permissions, transaction)
 * @returns Promise resolving to array of created resources or transaction result
 */
export const batchCreateWithTransaction = async <T, D = Partial<T>>(
  endpoint: string,
  dataArray: D[],
  options?: {
    skipValidation?: boolean;
    skipPermissionCheck?: boolean;
    skipAudit?: boolean;
    userId?: string | number;
    validationRules?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    batchSize?: number;
    rollbackOnError?: boolean;
    continueOnError?: boolean;
  },
): Promise<{
  success: T[];
  failed: { data: D; error: string; index: number }[];
  transactionId?: string;
}> => {
  const {
    skipValidation = false,
    skipPermissionCheck = false,
    skipAudit = false,
    userId,
    validationRules,
    metadata,
    batchSize = 100,
    rollbackOnError = true,
    continueOnError = false,
  } = options || {};

  try {
    // 1. Permission Check
    if (!skipPermissionCheck && userId) {
      const permission = await checkPermission(
        '/permissions',
        'create',
        endpoint.replace('/', '').replace(/s$/, ''),
        undefined,
        userId,
      );

      if (!permission.allowed) {
        throw new Error(
          `Permission denied: ${permission.reason || 'Not authorized to create these resources'}`,
        );
      }
    }

    // 2. Validate all data first
    let validatedDataArray = dataArray;
    if (!skipValidation) {
      validatedDataArray = await Promise.all(
        dataArray.map((data) =>
          validateAndSanitize(endpoint, data, validationRules),
        ),
      );
    }

    // 3. Process in batches with transaction support
    const chunks = [];
    for (let i = 0; i < validatedDataArray.length; i += batchSize) {
      chunks.push(validatedDataArray.slice(i, i + batchSize));
    }

    const response = await axiosInstance.post(`${endpoint}/batch-create`, {
      chunks,
      options: {
        rollbackOnError,
        continueOnError,
      },
    });

    const result = response.data;

    // 4. Audit Logging for batch operation
    if (!skipAudit && userId) {
      await createAuditLog(
        '/audit-logs',
        'create',
        endpoint.replace('/', '').replace(/s$/, ''),
        'batch',
        undefined,
        {
          totalRecords: dataArray.length,
          successCount: result.success.length,
          failedCount: result.failed.length,
          transactionId: result.transactionId,
        },
        userId,
        {
          ...metadata,
          batchSize,
          rollbackOnError,
          continueOnError,
        },
      );
    }

    return result;
  } catch (error: unknown) {
    handleError(error, 'Failed to batch create resources');
  }
};