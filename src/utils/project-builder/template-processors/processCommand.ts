import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { loadConstant } from '@/utils/project-builder/template-processors/loadConstant.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { processIterateCommand } from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import {
  TEMPLATE_ACTIONS,
  USE_FORM_DATA_REGEX,
  USE_USER_ENV_REGEX,
  USE_DATA_REGEX,
} from '@/utils/project-builder/constants/templateActions.ts';
import { processUseTemplate } from '@/utils/project-builder/template-processors/useTemplate.ts';
import type { IFormStore } from '@/useFormStore.ts';
import type { DataContext } from '@/utils/project-builder/interfaces/interfaces.ts';

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
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataContext?: DataContext,
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
        formData,
      ).join(',');
    },
  );

  // Process USE_FORM_DATA commands
  const useFormDataRegex = new RegExp(USE_FORM_DATA_REGEX.source, 'g');

  result = result.replace(
    useFormDataRegex,
    (_match: string, group1: string) => {
      if (!formData) {
        return '';
      }
      const formDataKey = group1.trim();
      if (!(formDataKey in formData)) {
        return '';
      }
      const value = formData[formDataKey];
      if (value === undefined || value === null) {
        return '';
      }
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'boolean' || typeof value === 'number') {
        return String(value);
      }
      if (Array.isArray(value)) {
        return value.join(',');
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return '';
    },
  );

  // Process USE_USER_ENV commands
  const useUserEnvRegex = new RegExp(USE_USER_ENV_REGEX.source, 'g');

  const isRecord = (val: unknown): val is Record<string, unknown> => {
    return (
      val !== null &&
      val !== undefined &&
      typeof val === 'object' &&
      !Array.isArray(val)
    );
  };

  result = result.replace(useUserEnvRegex, (_match: string, group1: string) => {
    if (!userMetadata) {
      return '';
    }
    const env = userMetadata.env;
    if (!isRecord(env)) {
      return '';
    }
    const envKey = group1.trim();
    if (!(envKey in env)) {
      return '';
    }
    const value: unknown = env[envKey];
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.join(',');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return '';
  });

  // Process USE_DATA commands
  const useDataRegex = new RegExp(USE_DATA_REGEX.source, 'g');

  result = result.replace(useDataRegex, (_match: string, group1: string) => {
    if (!dataContext) {
      return '';
    }
    const dataKey = group1.trim();
    if (!(dataKey in dataContext)) {
      return '';
    }
    const value = dataContext[dataKey];
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return '';
  });

  // Then, process USE_TEMPLATE commands to include other templates
  // Pass both templateFilePath and projectFilePath to properly handle relative paths
  result = processUseTemplate(
    result,
    userFiles,
    schemaInfoParsed,
    templateFilePath,
    projectFilePath,
    table,
    formData,
    userMetadata,
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
            formData,
            userMetadata,
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
        formData,
        userMetadata,
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
