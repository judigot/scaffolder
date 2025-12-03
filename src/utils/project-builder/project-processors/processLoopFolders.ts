import type { IFile } from '@/components/FileViewer.tsx';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import type {
  IActionFlags,
  IBuildContext,
} from '@/utils/project-builder/interfaces/interfaces.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { processTemplatePathWithFlag } from '@/utils/project-builder/utils/processRelativePath.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import {
  findFilesMatchingGlob,
  createDataContextReplacements,
} from '@/utils/project-builder/utils/dataSourceUtils.ts';

interface ILoopFoldersContext extends Omit<IBuildContext, 'table'> {
  command: string;
  options: IActionFlags;
}

const buildAbsolutePath = (fileName: string, currentPath: string): string => {
  if (currentPath === '') {
    return fileName;
  }
  return `${currentPath}/${fileName}`;
};

export const processLoopFolders = async ({
  command: fileName,
  options,
  userFiles,
  projectYamlPath,
  schemaInfo = [],
  schemaInfoParsed,
  onFileFailedToFormat,
  currentPath = '',
}: ILoopFoldersContext): Promise<IFile[]> => {
  if (!fileName || fileName.length === 0) {
    return [];
  }

  const dataSourcePattern = options[ACTION_FLAGS.DATA_SOURCE];
  if (dataSourcePattern === undefined || dataSourcePattern === '') {
    return [];
  }

  let templatePath = options[ACTION_FLAGS.TEMPLATE];
  const hasRelativeTemplatePath =
    ACTION_FLAGS.IS_RELATIVE_PATH in options &&
    options[ACTION_FLAGS.IS_RELATIVE_PATH] === true &&
    typeof templatePath === 'string';

  if (
    hasRelativeTemplatePath &&
    templatePath !== undefined &&
    templatePath !== ''
  ) {
    templatePath = processTemplatePathWithFlag(
      templatePath,
      projectYamlPath,
      true,
    );
  }

  let templateContent = '';
  if (templatePath !== undefined && templatePath.trim().length > 0) {
    templateContent = loadTemplateContent(
      userFiles,
      templatePath,
      projectYamlPath,
    );
  } else {
    templateContent = loadTemplateContent(userFiles, fileName, projectYamlPath);
  }

  const dataMatches = findFilesMatchingGlob(userFiles, dataSourcePattern);

  const files = await Promise.all(
    dataMatches.map(async (match) => {
      const { augmentedData, replacements } = createDataContextReplacements(
        match.data,
        match.folderPath,
      );

      const dataCtx = {
        userFiles,
        schemaInfo,
        schemaInfoParsed,
        projectYamlPath,
        dataContext: augmentedData,
      };

      const processedName = replacePlaceholders(
        fileName,
        replacements,
        dataCtx,
      );

      const outputFileName = processedName.includes('/')
        ? extractFileNameFromPath(processedName)
        : processedName;

      const processedContent = replacePlaceholders(
        templateContent,
        replacements,
        dataCtx,
        templatePath,
      );

      const shouldFormat = options[ACTION_FLAGS.FORMAT] !== false;
      const formatResult = await formatFileContent(
        processedContent,
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
