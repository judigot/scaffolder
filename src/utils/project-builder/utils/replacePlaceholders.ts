import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { processIfConditions } from '@/utils/project-builder/template-processors/processIfConditions.ts';
import { importTemplateAsPlaceholder } from '@/utils/project-builder/template-processors/importTemplateAsPlaceholder.ts';
import type {
  Replacements,
  BuildContext,
} from '@/utils/project-builder/interfaces/interfaces.ts';
import { processDynamicProperties } from '@/utils/project-builder/utils/processDynamicProperties.ts';

/**
 * Replaces placeholders in a template with values from the replacements object
 * Enhanced version that properly handles dynamic properties like array separators and indexed access
 *
 * @param text - The template text to process
 * @param replacements - Key-value pairs for placeholder replacement
 * @param ctx - Build context containing userFiles, schemaInfo, formData, etc.
 * @param templateFilePath - Optional path to the template file
 * @param skipLoopDataSources - Whether to skip processing LOOP_DATA_SOURCES
 */
export const replacePlaceholders = (
  text: string,
  replacements: Replacements,
  ctx: BuildContext,
  templateFilePath?: string,
  skipLoopDataSources = false,
): string => {
  // Process all commands
  const processedText = processCommand(
    text,
    ctx.userFiles,
    ctx.schemaInfoParsed,
    ctx.table,
    templateFilePath,
    ctx.projectYamlPath,
    ctx.formData,
    ctx.userMetadata,
    ctx.dataContext,
    skipLoopDataSources,
  );

  // Process IF conditions
  const processedConditions = processIfConditions(processedText, replacements);

  // Process function calls (index, timestamp) FIRST before other placeholders
  // This ensures function calls are processed even if they're not in replacements
  const processedFunctions = processDynamicProperties(
    processedConditions,
    replacements,
  );

  // Process placeholders, allowing for references between properties
  try {
    const processedPlaceholders = importTemplateAsPlaceholder(
      processedFunctions,
      replacements,
    );

    // Convert result to string
    const processedResult =
      typeof processedPlaceholders === 'string'
        ? processedPlaceholders
        : Array.isArray(processedPlaceholders)
          ? processedPlaceholders.join(',')
          : String(processedPlaceholders);

    // Process any remaining dynamic properties (in case importTemplateAsPlaceholder created new function calls)
    return processDynamicProperties(processedResult, replacements);
  } catch {
    // If there was an error in the template processing, fall back to direct dynamic property processing
    return processDynamicProperties(processedConditions, replacements);
  }
};
