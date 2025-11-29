import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';
import { ACTION_FLAGS } from '@/utils/project-builder/constants/actionFlags.ts';
import { extractFileNameFromPath } from '@/utils/project-builder/helpers/extractFileNameFromPath.ts';
import { formatFileContent } from '@/utils/project-builder/helpers/formatFileContent.ts';
import type {
  IActionFlags,
  IBuildContext,
  DataContext,
  Replacements,
} from '@/utils/project-builder/interfaces/interfaces.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import { processTemplatePathWithFlag } from '@/utils/project-builder/utils/processRelativePath.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { parse } from 'yaml';

interface ILoopFoldersContext extends Omit<IBuildContext, 'table'> {
  command: string;
  options: IActionFlags;
}

interface IDataSourceMatch {
  folder: IFolder;
  data: DataContext;
  folderPath: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const flattenData = (
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, string> = {},
): Record<string, string> => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value === null || value === undefined) {
        result[newKey] = '';
      } else if (Array.isArray(value)) {
        result[newKey] = value.map((item) => String(item)).join(', ');
        for (let i = 0; i < value.length; i++) {
          result[`${newKey}[${String(i)}]`] = String(value[i]);
        }
      } else if (isRecord(value)) {
        flattenData(value, newKey, result);
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint' ||
        typeof value === 'symbol'
      ) {
        result[newKey] = String(value);
      }
    }
  }
  return result;
};

const findFilesMatchingGlob = (
  userFiles: IStructure,
  globPattern: string,
): IDataSourceMatch[] => {
  const results: IDataSourceMatch[] = [];
  const normalizedPattern = globPattern.startsWith('/')
    ? globPattern.substring(1)
    : globPattern;
  const parts = normalizedPattern.split('/').filter(Boolean);

  const findAllFilesRecursively = (
    items: IStructure,
    fileName: string,
    currentPath: string,
    parentFolder?: IFolder,
  ): void => {
    for (const item of items) {
      if (item.type === 'folder') {
        const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
        findAllFilesRecursively(item.children, fileName, newPath, item);
      } else {
        const matchesName =
          item.name === fileName ||
          fileName === '*' ||
          (fileName.includes('*') &&
            new RegExp(
              `^${fileName.replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
            ).test(item.name));

        if (matchesName && parentFolder) {
          try {
            const parsed: unknown = parse(item.content);
            if (isRecord(parsed)) {
              const flatData = flattenData(parsed);
              results.push({
                folder: parentFolder,
                data: { ...parsed, ...flatData },
                folderPath: currentPath,
              });
            } else {
              results.push({
                folder: parentFolder,
                data: {},
                folderPath: currentPath,
              });
            }
          } catch {
            results.push({
              folder: parentFolder,
              data: {},
              folderPath: currentPath,
            });
          }
        }
      }
    }
  };

  const findRecursive = (
    items: IStructure,
    patternIndex: number,
    currentPath: string,
    parentFolder?: IFolder,
  ): void => {
    if (patternIndex >= parts.length) {
      return;
    }

    const currentPart = parts[patternIndex];
    const isLastPart = patternIndex === parts.length - 1;

    if (currentPart === '**') {
      if (isLastPart) {
        return;
      }

      const nextPart = parts[patternIndex + 1];
      if (nextPart && patternIndex + 1 === parts.length - 1) {
        findAllFilesRecursively(items, nextPart, currentPath, parentFolder);
        return;
      }

      for (const item of items) {
        if (item.type === 'folder') {
          const newPath = currentPath
            ? `${currentPath}/${item.name}`
            : item.name;
          findRecursive(item.children, patternIndex + 1, newPath, item);
          findRecursive(item.children, patternIndex, newPath, item);
        }
      }
      return;
    }

    for (const item of items) {
      if (item.type === 'folder' && !isLastPart) {
        if (item.name === currentPart || currentPart === '*') {
          const newPath = currentPath
            ? `${currentPath}/${item.name}`
            : item.name;
          findRecursive(item.children, patternIndex + 1, newPath, item);
        }
      } else if (item.type === 'file' && isLastPart) {
        const matchesName =
          item.name === currentPart ||
          currentPart === '*' ||
          (currentPart.includes('*') &&
            new RegExp(
              `^${currentPart.replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
            ).test(item.name));

        if (matchesName && parentFolder) {
          try {
            const parsed: unknown = parse(item.content);
            if (isRecord(parsed)) {
              const flatData = flattenData(parsed);
              results.push({
                folder: parentFolder,
                data: { ...parsed, ...flatData },
                folderPath: currentPath,
              });
            } else {
              results.push({
                folder: parentFolder,
                data: {},
                folderPath: currentPath,
              });
            }
          } catch {
            results.push({
              folder: parentFolder,
              data: {},
              folderPath: currentPath,
            });
          }
        }
      }
    }
  };

  const firstPart = parts[0];
  for (const item of userFiles) {
    if (item.type === 'folder') {
      if (item.name === firstPart || firstPart === '**') {
        if (firstPart === '**') {
          const fileName = parts[parts.length - 1] ?? '';
          findAllFilesRecursively([item], fileName, '', undefined);
        } else {
          findRecursive(item.children, 1, item.name, item);
        }
      }
    }
  }

  return results;
};

export const processLoopFolders = ({
  command: fileName,
  options,
  userFiles,
  projectYamlPath,
  schemaInfoParsed,
}: ILoopFoldersContext): IFile[] => {
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

  const files: IFile[] = dataMatches.map((match) => {
    const data = match.data;

    const folderNameParts = match.folderPath.split('/');
    const folderName = folderNameParts[folderNameParts.length - 1] ?? '';

    const augmentedData: DataContext = {
      ...data,
      folderName,
      folderPath: match.folderPath,
      name: folderName,
    };

    const flattenedData = flattenData(augmentedData);
    const replacements: Replacements = {};
    for (const [key, value] of Object.entries(flattenedData)) {
      replacements[key] = value;
    }

    const processedName = replacePlaceholders(
      fileName,
      replacements,
      userFiles,
      schemaInfoParsed,
      undefined,
      projectYamlPath,
      undefined,
      undefined,
      undefined,
      augmentedData,
    );

    const outputFileName = processedName.includes('/')
      ? extractFileNameFromPath(processedName)
      : processedName;

    const processedContent = replacePlaceholders(
      templateContent,
      replacements,
      userFiles,
      schemaInfoParsed,
      undefined,
      projectYamlPath,
      templatePath,
      undefined,
      undefined,
      augmentedData,
    );

    const finalContent = formatFileContent(processedContent);

    return {
      type: 'file',
      name: outputFileName,
      content: finalContent,
    };
  });

  return files.filter((file) => file.content.trim().length > 0);
};
