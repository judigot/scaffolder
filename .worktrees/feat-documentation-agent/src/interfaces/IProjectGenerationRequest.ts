import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';

/**
 * Shared request body interface for project generation endpoints.
 * Used by both `/scaffold` and `/create-local-files` endpoints.
 */
export interface IProjectGenerationRequest {
  schemaInfo: ISchemaInfo[];
  SQLSchema: string | null;
  formData: IFormStore;
  userMetadata?: Record<string, unknown> | null;
}
