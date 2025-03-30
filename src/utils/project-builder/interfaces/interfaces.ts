import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';

export type ReplacementValue = string | string[];
export type Replacements = Record<string, ReplacementValue>;

export interface IActionFlags {
  [ACTION_FLAGS.CONDITIONS]?: string[];
  [ACTION_FLAGS.TEMPLATE]?: string;
  [ACTION_FLAGS.INCLUDE_TABLE]?: string;
  [ACTION_FLAGS.SCOPED]?: boolean;
  [ACTION_FLAGS.EXCLUDE_TABLE]?: string;
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
}
