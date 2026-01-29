import type {
  BuildContext,
  DataContext,
  IBuildContext,
  IActionFlags,
} from '../interfaces/interfaces.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import type { IFormStore } from '@/useFormStore.ts';

/**
 * Single source of truth for BuildContext creation and modification.
 * When adding new properties to IBuildContext, only update:
 * 1. The interface (interfaces.ts)
 * 2. The createContext function below
 * All other files automatically get the new property through spread.
 */

/**
 * Create the initial BuildContext from individual parameters.
 * This is the ONLY place where you manually list all context properties.
 * When adding a new property to IBuildContext, add it here.
 */
export const createContext = (
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  projectYamlPath: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  table?: ISchemaInfo,
  dataContext?: DataContext,
  currentPath?: string,
  node?: unknown,
  command?: string,
  folderName?: string,
  children?: unknown,
  options?: IActionFlags,
  onFileUsingUserEnv?: (filePath: string) => void,
  onFileFailedToFormat?: (filePath: string, errorMessage: string) => void,
): IBuildContext => ({
  userFiles,
  schemaInfo,
  schemaInfoParsed,
  projectYamlPath,
  formData,
  userMetadata,
  table,
  dataContext,
  currentPath,
  node,
  command,
  folderName,
  children,
  options,
  onFileUsingUserEnv,
  onFileFailedToFormat,
});

/**
 * Create a new context with a different table
 */
export const withTable = (
  ctx: BuildContext,
  table: ISchemaInfo,
): BuildContext => ({
  ...ctx,
  table,
});

/**
 * Create a new context with a different path
 */
export const withPath = (
  ctx: BuildContext,
  currentPath: string,
): BuildContext => ({
  ...ctx,
  currentPath,
});

/**
 * Create a new context with a different data context
 */
export const withDataContext = (
  ctx: BuildContext,
  dataContext: DataContext,
): BuildContext => ({
  ...ctx,
  dataContext,
});

/**
 * Create a new context with multiple modifications.
 * Use this for complex updates.
 */
export const withUpdates = (
  ctx: BuildContext,
  updates: Partial<BuildContext>,
): BuildContext => ({
  ...ctx,
  ...updates,
});
