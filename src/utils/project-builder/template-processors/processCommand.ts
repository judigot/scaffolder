import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { loadConstant } from '@/utils/project-builder/template-processors/loadConstant.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { IStructure } from '@/components/FileViewer.tsx';
import { processIterateCommand } from '@/utils/project-builder/template-processors/processIterateCommand.ts';

export const processCommand = (
  text: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
): string => {
  // Process all commands in order of specificity
  let result = text;

  // First, process USE_CONSTANT commands
  result = result.replace(
    /\[\[\s*USE_CONSTANT\(([^)]+)\)\s*\]\]/g,
    (_match: string, group1: string) => {
      if (!table) {
        return '';
      }
      const constantName = String(group1).trim();
      return loadConstant(
        constantName,
        userFiles,
        schemaInfoParsed,
        table,
      ).join(',');
    },
  );

  result = result.replace(
    /\[\[\s*ITERATE\(([^[\]]*?(?:\{\{[^}]*\}\})?[^[\]]*)\)([^\]]*)\]\]/g,
    (fullMatch: string, group1: string, group2: string) => {
      if (!table) {
        return '';
      }
      const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
      const propertyPaths = String(group1);
      const options = String(group2);
      const cmdResult = processIterateCommand(
        `ITERATE(${propertyPaths})${options}`,
        table,
        schemaInfoParsed,
        userFiles,
      );
      return cmdResult ? String(whitespace) + String(cmdResult) : '';
    },
  );

  return result;
};
