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
}

export interface IBuildContext {
  node?: unknown;
  userFiles: IStructure;
  schemaInfo: ISchemaInfo[];
  schemaInfoParsed: ISchemaInfoResult;
  projectYamlPath: string;
  table?: ISchemaInfo;
  command?: string;
  folderName?: string;
  children?: unknown;
  formData?: IFormStore;
  userMetadata?: Record<string, unknown> | null;
}
