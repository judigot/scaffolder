import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { USE_TEMPLATE_REGEX } from '@/utils/project-builder/constants/templateActions.ts';
import { isPathRelative, getProjectDirectory } from '@/utils/project-builder/utils/processRelativePath.ts';

/**
 * Processes the USE_TEMPLATE command in a template.
 * This command allows including the content of another template file, supporting both
 * absolute and relative paths.
 * 
 * Example usage in a template:
 * [[USE_TEMPLATE(/path/to/template.txt)]]
 * 
 * For relative paths, the path is resolved relative to the parent template file:
 * [[USE_TEMPLATE(relative/path/to/template.txt)]]
 * 
 * @param text The template text containing USE_TEMPLATE commands
 * @param userFiles The file structure containing template files
 * @param schemaInfoParsed The parsed schema information
 * @param templatePath The path of the current template file (for relative path resolution)
 * @param projectFilePath The path to the current project file (fallback for relative path resolution)
 * @param table The current schema table being processed
 * @returns The processed template with USE_TEMPLATE commands replaced with template content
 */
export const processUseTemplate = (
  text: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  templatePath?: string,
  projectFilePath?: string,
  table?: ISchemaInfo,
): string => {
  return text.replace(
    USE_TEMPLATE_REGEX,
    (_match: string, importPath: string) => {
      // Trim whitespace and quotes
      const cleanPath = String(importPath).trim().replace(/^['"]|['"]$/g, '');
      
      // Determine which path to use for loading and processing
      let pathToUse = cleanPath;
      
      // Only attempt to resolve relative paths relative to the template
      const isRelative = isPathRelative(cleanPath);
      const hasTemplatePath = typeof templatePath === 'string' && templatePath.length > 0;
      
      if (isRelative && hasTemplatePath) {
        // Get the directory of the template 
        const templateDir = getProjectDirectory(templatePath);
        
        if (templateDir.length > 0) {
          // Normalize the import path (remove leading ./)
          const normalizedImportPath = cleanPath.startsWith('./') 
            ? cleanPath.substring(2) 
            : cleanPath;
            
          // Combine template directory with import path
          pathToUse = `${templateDir}/${normalizedImportPath}`;
        }
      }
      
      // Load the template content
      const templateContent = loadTemplateContent(
        userFiles, 
        pathToUse,
        projectFilePath
      );
      
      if (!templateContent || templateContent.length === 0) {
        return `<!-- Template not found: ${String(cleanPath)} -->`;
      }
      
      // Process commands in the loaded template, passing the resolved path
      // for proper handling of nested template imports
      const processedContent = processCommand(
        templateContent,
        userFiles,
        schemaInfoParsed,
        table,
        // Use the resolved path to ensure proper relative path resolution for nested imports
        pathToUse
      );
      
      return processedContent;
    },
  );
};
