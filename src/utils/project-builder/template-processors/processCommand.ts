import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { loadConstant } from '@/utils/project-builder/template-processors/loadConstant.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { IStructure } from '@/components/FileViewer.tsx';
import { processIterateCommand } from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { TEMPLATE_ACTIONS } from '@/utils/project-builder/constants/templateActions.ts';
import { processUseTemplate } from '@/utils/project-builder/template-processors/useTemplate.ts';

export const processCommand = (
  text: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  projectFilePath?: string,
): string => {
  // Process all commands in order of specificity
  let result = text;

  // First, process USE_CONSTANT commands
  const useConstantRegex = new RegExp(
    `\\[\\[\\s*${TEMPLATE_ACTIONS.USE_CONSTANT}\\(([^)]+)\\)\\s*\\]\\]`,
    'g',
  );

  result = result.replace(
    useConstantRegex,
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
        projectFilePath,
      ).join(',');
    },
  );

  // Then, process USE_TEMPLATE commands to include other templates
  result = processUseTemplate(result, userFiles, schemaInfoParsed, projectFilePath, table);

  const iterateRegex = new RegExp(
    `\\[\\[\\s*${TEMPLATE_ACTIONS.LOOP}\\(([^\\[\\]]*?(?:\\{\\{[^}]*\\}\\})?[^\\[\\]]*)\\)([^\\]]*)\\]\\]`,
    'g',
  );

  result = result.replace(
    iterateRegex,
    (fullMatch: string, group1: string, group2: string) => {
      if (!table) {
        return '';
      }
      const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
      const propertyPaths = String(group1);
      const options = String(group2);
      const cmdResult = processIterateCommand(
        `${TEMPLATE_ACTIONS.LOOP}(${propertyPaths})${options}`,
        table,
        schemaInfoParsed,
        userFiles,
        projectFilePath,
      );
      return cmdResult ? String(whitespace) + String(cmdResult) : '';
    },
  );

  return result;
};
