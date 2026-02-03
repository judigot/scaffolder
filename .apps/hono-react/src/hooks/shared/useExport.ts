import { axiosInstance } from '@/vendor/axiosInstance.ts';
import { handleError } from './handleError.ts';
import { checkPermission } from '@/hooks/shared/useValidation.ts';
import { createAuditLog } from '@/hooks/shared/useAudit.ts';

/**
 * Exports data in various formats (CSV, Excel, JSON, PDF)
 * @param endpoint The API endpoint for export
 * @param format The export format
 * @param filters Optional filters to apply
 * @param columns Optional specific columns to export
 * @param options Export options (permissions, audit)
 * @returns Promise resolving to the exported file or download URL
 */
export const exportData = async <T>(
  endpoint: string,
  format: 'csv' | 'excel' | 'json' | 'pdf',
  filters?: Record<string, unknown>,
  columns?: string[],
  options?: {
    skipPermissionCheck?: boolean;
    skipAudit?: boolean;
    userId?: string | number;
    metadata?: Record<string, unknown>;
    filename?: string;
  },
): Promise<{ url: string; filename: string }> => {
  const {
    skipPermissionCheck = false,
    skipAudit = false,
    userId,
    metadata,
    filename,
  } = options || {};

  try {
    // 1. Permission Check
    if (!skipPermissionCheck && userId) {
      const permission = await checkPermission(
        '/permissions',
        'read',
        endpoint.replace('/', '').replace(/s$/, ''),
        undefined,
        userId,
      );

      if (!permission.allowed) {
        throw new Error(
          `Permission denied: ${permission.reason || 'Not authorized to export this data'}`,
        );
      }
    }

    // 2. Export Data
    const response = await axiosInstance.post(
      `${endpoint}/export`,
      {
        format,
        filters,
        columns,
        filename,
      },
      {
        responseType: 'blob',
      },
    );

    // 3. Create download URL
    const blob = new Blob([response.data], {
      type: response.headers['content-type'],
    });
    const url = window.URL.createObjectURL(blob);
    const exportFilename = filename || `export-${Date.now()}.${format}`;

    // 4. Audit Logging
    if (!skipAudit && userId) {
      await createAuditLog(
        '/audit-logs',
        'export',
        endpoint.replace('/', '').replace(/s$/, ''),
        'bulk',
        undefined,
        undefined,
        userId,
        {
          ...metadata,
          format,
          filters,
          columns,
          filename: exportFilename,
        },
      );
    }

    return { url, filename: exportFilename };
  } catch (error: unknown) {
    handleError(error, 'Failed to export data');
  }
};