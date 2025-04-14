import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { processIfConditions } from '@/utils/project-builder/template-processors/processIfConditions.ts';
import { importTemplateAsPlaceholder } from '@/utils/project-builder/template-processors/importTemplateAsPlaceholder.ts';
import { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';

export const replacePlaceholders = (
  text: string,
  replacements: Replacements,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  projectFilePath?: string,
  templateFilePath?: string,
): string => {
  // Process all commands
  const processedText = processCommand(
    text,
    userFiles,
    schemaInfoParsed,
    table,
    templateFilePath,
    projectFilePath,
  );

  // Process IF conditions
  const processedConditions = processIfConditions(processedText, replacements);

  // Process placeholders, allowing for references between properties
  try {
    const processedPlaceholders = importTemplateAsPlaceholder(
      processedConditions,
      replacements,
    );

    return typeof processedPlaceholders === 'string'
      ? processedPlaceholders
      : Array.isArray(processedPlaceholders)
        ? processedPlaceholders.join(',')
        : String(processedPlaceholders);
  } catch {
    // Original placeholder processing for backward compatibility
    return processedConditions.replace(
      /\$_([^_]+)_\$|\{\{([^}]+)\}\}/g,
      (
        _,
        placeholder1: string | undefined,
        placeholder2: string | undefined,
      ) => {
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
  }
};
