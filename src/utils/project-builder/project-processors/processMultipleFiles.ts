import { IFile, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import { IActionFlags } from '@/utils/project-builder/interfaces/interfaces.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { processIterateInTemplate } from '@/utils/project-builder/template-processors/processIterateInTemplate.ts';
import { processLoopTables } from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';

export const processMultipleFiles = (
  fileName: string,
  options: IActionFlags = {},
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
): IFile[] => {
  let templateContent = '';

  const templateOption = options[ACTION_FLAGS.TEMPLATE];
  if (typeof templateOption === 'string' && templateOption.trim().length > 0) {
    const loadedContent = loadTemplateContent(userFiles, templateOption);
    if (loadedContent.length > 0) {
      templateContent = loadedContent;
    }
  } else {
    templateContent = loadTemplateContent(userFiles, fileName);
  }

  const files: IFile[] = schemaInfo
    .filter((table) => {
      const includeTableOption = options[ACTION_FLAGS.INCLUDE_TABLE];
      const excludeTableOption = options[ACTION_FLAGS.EXCLUDE_TABLE];
      const scopedOption = options[ACTION_FLAGS.SCOPED];

      if (
        (includeTableOption?.trim().length ?? 0) > 0 ||
        (excludeTableOption?.trim().length ?? 0) > 0 ||
        scopedOption === true
      ) {
        const replacements = getReplacementsForTable(table, schemaInfoParsed);

        if (
          includeTableOption != null &&
          includeTableOption.trim().length > 0
        ) {
          const processedIncludeTable = replacePlaceholders(
            includeTableOption,
            replacements,
            userFiles,
            schemaInfoParsed,
            table,
          );
          if (table.tableName !== processedIncludeTable) {
            return false;
          }
        }
      }

      if (excludeTableOption != null && excludeTableOption.trim().length > 0) {
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedExcludeTable = replacePlaceholders(
          excludeTableOption,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
        );
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

      const outputFileName = processedName.includes('/')
        ? extractFileNameFromPath(processedName)
        : processedName;

      let content = processLoopTables(
        templateContent,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
      );

      content = replacePlaceholders(
        content,
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

      const finalContent = formatFileContent(content);

      return {
        type: 'file',
        name: outputFileName,
        content: finalContent,
      };
    });

  return files.filter((file) => file.content.trim().length > 0);
};
