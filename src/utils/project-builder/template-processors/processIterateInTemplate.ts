import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { TEMPLATE_ACTIONS } from '@/utils/project-builder/constants/templateActions.ts';
import { processIterateCommand } from '@/utils/project-builder/template-processors/processIterateCommand.ts';

export const processIterateInTemplate = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  table?: ISchemaInfo,
): string => {
  const iterateRegex = new RegExp(
    `\\[\\[\\s*${TEMPLATE_ACTIONS.LOOP}\\(([^\\[\\]]*?(?:\\{\\{[^}]*\\}\\})?[^\\[\\]]*)\\)([^\\]]*)\\]\\]`,
    'g',
  );

  return content.replace(
    iterateRegex,
    (fullMatch: string, propertyPathsStr: string, options: string) => {
      // If no table context is provided, try to use the first schema
      if (!table && schemaInfo.length > 0) {
        table = schemaInfo[0];
      }

      if (table) {
        const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
        const cmdResult = processIterateCommand(
          `${TEMPLATE_ACTIONS.LOOP}(${propertyPathsStr})${options}`,
          table,
          schemaInfoParsed,
          userFiles,
        );
        return cmdResult ? String(whitespace) + String(cmdResult) : '';
      }

      // If no valid table context is available, return the original match
      return fullMatch;
    },
  );
};
