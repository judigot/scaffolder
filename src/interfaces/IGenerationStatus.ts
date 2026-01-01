/**
 * Status interface for project generation operations.
 * Used by both `/scaffold` and `/create-local-files` endpoints.
 */
export interface IGenerationStatus {
  isBackendUrlValid: boolean;
  isBackendDirValid: boolean;
  isFrontendDirValid: boolean;
  isDBConnectionValid: boolean;
  errorMessage: string | null;
  sqlSchema?: string | null;
  errorLine?: number | null;
  errorPosition?: number | null;
}
