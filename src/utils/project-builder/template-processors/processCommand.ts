import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { loadConstant } from '@/utils/project-builder/template-processors/loadConstant.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { processIterateCommand } from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { TEMPLATE_ACTIONS } from '@/utils/project-builder/constants/templateActions.ts';
import { processUseTemplate } from '@/utils/project-builder/template-processors/useTemplate.ts';

/**
 * Helper function to check if a string has content
 */
const hasContent = (str: string): boolean => str.length > 0;

/**
 * Check if a line contains only LOOP tags and whitespace
 */
const hasOnlyLoopTags = (line: string): boolean => {
  // Remove all LOOP tags
  const withoutLoopTags = line.replace(/\[\[\s*LOOP\([^)]*?\).*?\]\]/g, '');
  // Check if anything other than whitespace remains
  return !/\S/.test(withoutLoopTags);
};

export const processCommand = (
  text: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  templateFilePath?: string,
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
      const constantName = group1.trim();
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
  // Pass both templateFilePath and projectFilePath to properly handle relative paths
  result = processUseTemplate(
    result,
    userFiles,
    schemaInfoParsed,
    templateFilePath,
    projectFilePath,
    table,
  );

  // Remove entire lines where LOOP tags produce empty results
  // Match the line containing a LOOP tag, capturing the newline character after it
  const lineWithLoopRegex = new RegExp(
    `^.*?\\[\\[\\s*${TEMPLATE_ACTIONS.LOOP}\\([^)]*?\\).*?\\]\\].*?(\r?\n)?`,
    'gm',
  );

  result = result.replace(
    lineWithLoopRegex,
    (fullLine: string, _newlineChar: string) => {
      if (!table) {
        return '';
      }

      // Check if this line contains only LOOP tags (and whitespace)
      // If it has other content, we shouldn't remove the whole line
      const shouldRemoveWholeLine = hasOnlyLoopTags(fullLine);

      // Extract just the LOOP command portion
      const loopTagRegex = new RegExp(
        `\\[\\[\\s*${TEMPLATE_ACTIONS.LOOP}\\(([^)]*?)\\)(.*?)\\]\\]`,
        'g',
      );

      // We'll use this to track if any of the LOOP commands in the line produced content
      let lineHasContent = false;

      // Process each LOOP tag in the line
      const processedLine = fullLine.replace(
        loopTagRegex,
        (fullMatch: string, group1: string, group2: string) => {
          const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
          const propertyPaths = group1;
          const options = group2;
          const cmdResult = processIterateCommand(
            `${TEMPLATE_ACTIONS.LOOP}(${propertyPaths})${options}`,
            table,
            schemaInfoParsed,
            userFiles,
            projectFilePath,
          );

          // Only add whitespace if cmdResult has content
          let resultString = '';
          if (hasContent(cmdResult)) {
            resultString = whitespace + cmdResult;
            lineHasContent = true;
          }

          return resultString;
        },
      );

      // If none of the LOOP tags produced content AND the line only has LOOP tags,
      // remove the entire line (including newline)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!lineHasContent && shouldRemoveWholeLine) {
        return '';
      }

      return processedLine;
    },
  );

  // Process any remaining LOOP tags not caught by the line processor
  // (This handles cases where LOOP tags are not on their own lines)
  const iterateRegex = new RegExp(
    `\\[\\[\\s*${TEMPLATE_ACTIONS.LOOP}\\(([^)]*?)\\)(.*?)\\]\\]`,
    'g',
  );

  result = result.replace(
    iterateRegex,
    (fullMatch: string, group1: string, group2: string) => {
      if (!table) {
        return '';
      }
      const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
      const propertyPaths = group1;
      const options = group2;
      const cmdResult = processIterateCommand(
        `${TEMPLATE_ACTIONS.LOOP}(${propertyPaths})${options}`,
        table,
        schemaInfoParsed,
        userFiles,
        projectFilePath,
      );

      // Only add whitespace if cmdResult has content
      let resultString = '';
      if (hasContent(cmdResult)) {
        resultString = whitespace + cmdResult;
      }

      return resultString;
    },
  );

  // Clean up any extra blank lines that might have been created
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
};
