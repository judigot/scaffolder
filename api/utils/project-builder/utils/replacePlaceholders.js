import { processCommand } from '../../../utils/project-builder/template-processors/processCommand';
import { processIfConditions } from '../../../utils/project-builder/template-processors/processIfConditions';
import { importTemplateAsPlaceholder } from '../../../utils/project-builder/template-processors/importTemplateAsPlaceholder';
import { processDynamicProperties } from '../../../utils/project-builder/utils/processDynamicProperties';
/**
 * Replaces placeholders in a template with values from the replacements object
 * Enhanced version that properly handles dynamic properties like array separators and indexed access
 */
export const replacePlaceholders = (
  text,
  replacements,
  userFiles,
  schemaInfoParsed,
  table,
  projectFilePath,
  templateFilePath,
  formData,
  userMetadata,
) => {
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
