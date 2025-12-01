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
import {
  processLoopTables,
  processLoopTablesReversed,
  processLoopDataSources,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { USE_USER_ENV_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

interface IMultipleFilesContext extends Omit<IBuildContext, 'table'> {
  command: string;
  options?: IActionFlags;
}

const buildAbsolutePath = (fileName: string, currentPath: string): string => {
  if (currentPath === '') {
    return fileName;
  }
  return `${currentPath}/${fileName}`;
};

export const processMultipleFiles = async ({
  command: fileName,
  options = {},
  schemaInfo,
  schemaInfoParsed,
  userFiles,
  projectYamlPath,
  formData,
  userMetadata,
  onFileUsingUserEnv,
  onFileFailedToFormat,
  currentPath = '',
}: IMultipleFilesContext): Promise<IFile[]> => {
  if (!fileName || fileName.length === 0) {
    return [];
  }

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

  // Check if template uses USE_USER_ENV BEFORE processing
  // This detects usage even if the pattern gets replaced successfully
  if (
    templateContent.length > 0 &&
    USE_USER_ENV_REGEX.test(templateContent) &&
    onFileUsingUserEnv
  ) {
    // For FILE_LOOP, we'll track each generated file name
    // The actual file names will be determined during processing
    // We'll track them in the map function below
  }

  const filteredSchemaInfo = schemaInfo.filter((table) => {
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
          formData,
          userMetadata,
          undefined,
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
        formData,
        userMetadata,
        undefined,
      );
      if (table.tableName === processedExcludeTable) {
        return false;
      }
    }

    return true;
  });

  const files = await Promise.all(
    filteredSchemaInfo.map(async (table) => {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);
      const processedName = replacePlaceholders(
        fileName,
        replacements,
        userFiles,
        schemaInfoParsed,
        table,
        projectYamlPath,
        fileName,
        formData,
        userMetadata,
        undefined,
      );

      const outputFileName = processedName.includes('/')
        ? extractFileNameFromPath(processedName)
        : processedName;

      // Track file if template uses USE_USER_ENV
      if (USE_USER_ENV_REGEX.test(templateContent) && onFileUsingUserEnv) {
        onFileUsingUserEnv(buildAbsolutePath(outputFileName, currentPath));
      }

      let content = processLoopDataSources(
        processLoopTablesReversed(
          processLoopTables(
            templateContent,
            schemaInfo,
            schemaInfoParsed,
            userFiles,
            formData,
            userMetadata,
          ),
          schemaInfo,
          schemaInfoParsed,
          userFiles,
          formData,
          userMetadata,
        ),
        userFiles,
        schemaInfoParsed,
        formData,
        userMetadata,
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
        formData,
        userMetadata,
        undefined,
      );
      content = processIterateInTemplate(
        content,
        schemaInfo,
        schemaInfoParsed,
        userFiles,
        table,
        formData,
        userMetadata,
      );

      const shouldFormat = options[ACTION_FLAGS.FORMAT] !== false;
      const formatResult = await formatFileContent(
        content,
        outputFileName,
        shouldFormat,
      );

      if (formatResult.failed && onFileFailedToFormat) {
        onFileFailedToFormat(
          buildAbsolutePath(outputFileName, currentPath),
          formatResult.errorMessage ?? 'Unknown formatting error',
        );
      }

      return {
        type: 'file' as const,
        name: outputFileName,
        content: formatResult.content,
      } satisfies IFile;
    }),
  );

  return files.filter((file) => file.content.trim().length > 0);
};
