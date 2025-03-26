import { IFile, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import { ICommandOptions } from '@/utils/project-builder/interfaces/interfaces.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { processIterateInTemplate } from '@/utils/project-builder/template-processors/processIterateInTemplate.ts';
import { processLoopTables } from '@/utils/project-builder/template-processors/processLoopTables.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';

export const processMultipleFiles = (
  fileName: string,
  options: ICommandOptions = {},
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
): IFile[] => {
  // Get the template content once
  let templateContent = '';
  if (
    typeof options.template === 'string' &&
    options.template.trim().length > 0
  ) {
    const loadedContent = loadTemplateContent(userFiles, options.template);
    if (loadedContent.length > 0) {
      templateContent = loadedContent;
    }
  } else {
    // Try to load template based on filename if no template option provided
    templateContent = loadTemplateContent(userFiles, fileName);
  }

  const files: IFile[] = schemaInfo
    .filter((table) => {
      // Apply table filtering for include/exclude table flags
      if (
        (options.includeTable !== undefined &&
          options.includeTable.trim().length > 0) ||
        (options.excludeTable !== undefined &&
          options.excludeTable.trim().length > 0) ||
        options.scoped === true
      ) {
        // Process placeholders in the includeTable value
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedIncludeTable = replacePlaceholders(
          String(options.includeTable),
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
        );
        // Skip if the current table doesn't match the include filter
        if (table.tableName !== processedIncludeTable) {
          return false;
        }
      }

      // Process the new scoped flag
      if (options.scoped === true) {
        // Check for related tables in any of the relationship types
        const hasRelationships =
          [
            ...(table.hasMany ?? []),
            ...(table.hasOne ?? []),
            ...(table.belongsTo ?? []),
            ...(table.belongsToMany ?? []),
          ].length > 0;

        // Skip if there are no relationships
        if (!hasRelationships) {
          return false;
        }
      }

      if (
        options.excludeTable !== undefined &&
        options.excludeTable.trim().length > 0
      ) {
        // Process placeholders in the excludeTable value
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedExcludeTable = replacePlaceholders(
          String(options.excludeTable),
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
        );
        // Skip if the current table matches the exclude filter
        if (table.tableName === processedExcludeTable) {
          return false;
        }
      }

      return true;
    })
    .map((table) => {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);
      const processedName = replacePlaceholders(
        fileName,
        replacements,
        userFiles,
        schemaInfoParsed,
        table,
      );

      // Extract the base filename from the processed path if it contains slashes
      const outputFileName = processedName.includes('/')
        ? extractFileNameFromPath(processedName)
        : processedName;

      let content = '';
      content = replacePlaceholders(
        processLoopTables(
          templateContent,
          schemaInfo,
          schemaInfoParsed,
          userFiles,
        ),
        replacements,
        userFiles,
        schemaInfoParsed,
        table,
      );

      content = processIterateInTemplate(
        content,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        table,
      );

      // Format with consistent character handling
      const finalContent = formatFileContent(content);

      return {
        type: 'file',
        name: outputFileName,
        content: finalContent,
      };
    });

  // Filter out any empty files
  return files;
};
