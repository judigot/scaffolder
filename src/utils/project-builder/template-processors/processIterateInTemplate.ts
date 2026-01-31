import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { TEMPLATE_ACTIONS } from '@/utils/project-builder/constants/templateActions.ts';
import {
  processIterateCommand,
  processHtmlIf,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import type { IFormStore } from '@/useFormStore.ts';

export const processIterateInTemplate = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  table?: ISchemaInfo,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
): string => {
  // If no table context is provided, try to use the first schema
  let effectiveTable = table;
  if (!effectiveTable && schemaInfo.length > 0) {
    effectiveTable = schemaInfo[0];
  }

  // Process <@@IF@@> conditions first
  let result = content;
  if (effectiveTable) {
    const replacements = getReplacementsForTable(effectiveTable, schemaInfoParsed);
    result = processHtmlIf(result, replacements);
  }

  // Then process [[LOOP(...)]] syntax
  const iterateRegex = new RegExp(
    `\\[\\[\\s*${TEMPLATE_ACTIONS.LOOP}\\(([^\\[\\]]*?(?:\\{\\{[^}]*\\}\\})?[^\\[\\]]*)\\)([^\\]]*)\\]\\]`,
    'g',
  );

  return result.replace(
    iterateRegex,
    (fullMatch: string, propertyPathsStr: string, options: string) => {
      if (effectiveTable) {
        const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
        const cmdResult = processIterateCommand(
          `${TEMPLATE_ACTIONS.LOOP}(${propertyPathsStr})${options}`,
          effectiveTable,
          schemaInfoParsed,
          userFiles,
          undefined,
          formData,
          userMetadata,
        );
        return cmdResult ? whitespace + cmdResult : '';
      }

      // If no valid table context is available, return the original match
      return fullMatch;
    },
  );
};
