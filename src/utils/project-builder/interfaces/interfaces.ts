import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import type { IFormStore } from '@/useFormStore.ts';

export type ReplacementValue = string | string[];
export type Replacements = Record<string, ReplacementValue>;

export interface IActionFlags {
  [ACTION_FLAGS.CONDITIONS]?: string[];
  [ACTION_FLAGS.TEMPLATE]?: string;
  [ACTION_FLAGS.INCLUDE_TABLE]?: string;
  [ACTION_FLAGS.SCOPED]?: boolean;
  [ACTION_FLAGS.EXCLUDE_TABLE]?: string;
  [ACTION_FLAGS.IS_RELATIVE_PATH]?: boolean;
  [ACTION_FLAGS.DATA_SOURCE]?: string;
  [ACTION_FLAGS.FORMAT]?: boolean;
  onFileUsingUserEnv?: (filePath: string) => void;
  onFileFailedToFormat?: (filePath: string, errorMessage: string) => void;
}

export type DataContext = Record<string, unknown>;

/**
 * Build context containing all shared data for project building.
 * Pass this single object instead of many individual parameters.
 */
export interface IBuildContext {
  // Core data (always present after initialization)
  readonly userFiles: IStructure;
  readonly schemaInfo: ISchemaInfo[];
  readonly schemaInfoParsed: ISchemaInfoResult;
  readonly projectYamlPath: string;

  // Optional form/user data
  readonly formData?: IFormStore;
  readonly userMetadata?: Record<string, unknown> | null;

  // Contextual data (varies per scope)
  readonly table?: ISchemaInfo;
  readonly dataContext?: DataContext;
  readonly currentPath?: string;

  // Command-specific (used during YAML processing)
  readonly node?: unknown;
  readonly command?: string;
  readonly folderName?: string;
  readonly children?: unknown;
  readonly options?: IActionFlags;

  // Callbacks
  readonly onFileUsingUserEnv?: (filePath: string) => void;
  readonly onFileFailedToFormat?: (
    filePath: string,
    errorMessage: string,
  ) => void;
}

// Alias for cleaner imports (both names work)
export type BuildContext = IBuildContext;
