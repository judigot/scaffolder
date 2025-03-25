import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { processIfConditions } from '@/utils/project-builder/template-processors/processIfConditions.ts';

export const replacePlaceholders = (
  text: string,
  replacements: Record<string, string | string[]>,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
): string => {
  // First process all commands
  const processedText = processCommand(
    text,
    userFiles,
    schemaInfoParsed,
    table,
  );

  // Then process IF conditions
  const processedConditions = processIfConditions(processedText, replacements);

  // Then handle the regular placeholders
  return processedConditions.replace(
    /\$_([^_]+)_\$|\{\{([^}]+)\}\}/g,
    (_, placeholder1: string | undefined, placeholder2: string | undefined) => {
      const key = (placeholder2 ?? placeholder1 ?? '').trim();
      if (key.length === 0) {
        return '';
      }
      if (!(key in replacements)) {
        return key;
      }
      const value = replacements[key];
      // Handle array values by joining them with commas
      return Array.isArray(value) ? value.join(',') : value;
    },
  );
};
