import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { USE_TEMPLATE_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

/**
 * Processes the USE_TEMPLATE command in a template.
 * This command allows including the content of another template file, supporting both
 * absolute and relative paths.
 * 
 * Example usage in a template:
 * [[USE_TEMPLATE(/path/to/template.txt)]]
 * 
 * For relative paths, the path is resolved relative to the containing project file:
 * [[USE_TEMPLATE(relative/path/to/template.txt)]]
 * 
 * @param text The template text containing USE_TEMPLATE commands
 * @param userFiles The file structure containing template files
 * @param schemaInfoParsed The parsed schema information
 * @param projectFilePath The path to the current project file (for relative path resolution)
 * @param table The current schema table being processed
 * @returns The processed template with USE_TEMPLATE commands replaced with template content
 */
export const processUseTemplate = (
  text: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  projectFilePath?: string,
  table?: ISchemaInfo,
): string => {
  return text.replace(
    USE_TEMPLATE_REGEX,
    (_match: string, templatePath: string) => {
      // Trim whitespace and quotes
      const cleanPath = String(templatePath).trim().replace(/^['"]|['"]$/g, '');
      
      // Load the template content - loadTemplateContent handles both absolute and
      // relative paths based on the projectFilePath
      const templateContent = loadTemplateContent(userFiles, cleanPath, projectFilePath);
      
      if (!templateContent || templateContent.length === 0) {
        console.warn(`Template not found: ${String(cleanPath)}`);
        return `<!-- Template not found: ${String(cleanPath)} -->`;
      }
      
      // Process commands in the loaded template recursively
      // This allows nested templates to be included
      const processedContent = processCommand(
        templateContent,
        userFiles,
        schemaInfoParsed,
        table,
        projectFilePath,
      );
      
      return processedContent;
    },
  );
};
