import type { IFile } from '@/components/FileViewer.tsx';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import type {
  IActionFlags,
  IBuildContext,
} from '@/utils/project-builder/interfaces/interfaces.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { processIterateInTemplate } from '@/utils/project-builder/template-processors/processIterateInTemplate.ts';
import { processLoopTables } from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';

interface IMultipleFilesContext extends Omit<IBuildContext, 'table'> {
  command: string;
  options?: IActionFlags;
}

export const processMultipleFiles = ({
  command: fileName,
  options = {},
  schemaInfo,
  schemaInfoParsed,
  userFiles,
  projectYamlPath,
}: IMultipleFilesContext): IFile[] => {
  if (!fileName || fileName.length === 0) {
    return [];
  }

  // If the command was a parameter such as command(param), extracting just the command
  const _fileNameWithoutParams = fileName.replace(/\([^)]*\)/g, '');

  // Get the template name from either the explicit template option or use the filename
  const templateOption = options[ACTION_FLAGS.TEMPLATE];
  let templateContent = '';

  if (templateOption !== undefined && templateOption.trim().length > 0) {
    templateContent = loadTemplateContent(
      userFiles,
      templateOption,
      projectYamlPath,
    );
  } else {
    templateContent = loadTemplateContent(userFiles, fileName, projectYamlPath);
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
          includeTableOption !== undefined &&
          includeTableOption.trim().length > 0
        ) {
          const processedIncludeTable = replacePlaceholders(
            includeTableOption,
            replacements,
            userFiles,
            schemaInfoParsed,
            table,
            projectYamlPath,
            fileName,
          );
          if (table.tableName !== processedIncludeTable) {
            return false;
          }
        }
      }

      if (
        excludeTableOption !== undefined &&
        excludeTableOption.trim().length > 0
      ) {
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const processedExcludeTable = replacePlaceholders(
          excludeTableOption,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
          projectYamlPath,
          fileName,
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
        projectYamlPath,
        fileName,
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
        projectYamlPath,
        typeof templateOption === 'string' && templateOption.length > 0
          ? templateOption
          : fileName,
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
