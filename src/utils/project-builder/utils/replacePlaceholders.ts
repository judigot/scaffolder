import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { processIfConditions } from '@/utils/project-builder/template-processors/processIfConditions.ts';
import { importTemplateAsPlaceholder } from '@/utils/project-builder/template-processors/importTemplateAsPlaceholder.ts';
import type {
  Replacements,
  DataContext,
} from '@/utils/project-builder/interfaces/interfaces.ts';
import { processDynamicProperties } from '@/utils/project-builder/utils/processDynamicProperties.ts';
import type { IFormStore } from '@/useFormStore.ts';

/**
 * Replaces placeholders in a template with values from the replacements object
 * Enhanced version that properly handles dynamic properties like array separators and indexed access
 */
export const replacePlaceholders = (
  text: string,
  replacements: Replacements,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  projectFilePath?: string,
  templateFilePath?: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataContext?: DataContext,
  skipLoopDataSources = false,
): string => {
  // Process all commands
  const processedText = processCommand(
    text,
    userFiles,
    schemaInfoParsed,
    table,
    templateFilePath,
    projectFilePath,
    formData,
    userMetadata,
    dataContext,
    skipLoopDataSources,
  );

  // Process IF conditions
  const processedConditions = processIfConditions(processedText, replacements);

  // Process placeholders, allowing for references between properties
  try {
    const processedPlaceholders = importTemplateAsPlaceholder(
      processedConditions,
      replacements,
    );

    // Convert result to string
    const processedResult =
      typeof processedPlaceholders === 'string'
        ? processedPlaceholders
        : Array.isArray(processedPlaceholders)
          ? processedPlaceholders.join(',')
          : String(processedPlaceholders);

    // Process any remaining dynamic properties
    return processDynamicProperties(processedResult, replacements);
  } catch {
    // If there was an error in the template processing, fall back to direct dynamic property processing
    return processDynamicProperties(processedConditions, replacements);
  }
};
