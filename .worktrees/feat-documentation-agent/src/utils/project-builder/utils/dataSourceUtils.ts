import type { IFolder, IStructure } from '@/components/FileViewer.tsx';
import type { DataContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import { parse } from 'yaml';
import { isRecord } from '@/utils/typeGuards.ts';

export interface IDataSourceMatch {
  folder: IFolder;
  data: DataContext;
  folderPath: string;
}

export { isRecord };

export const flattenData = (
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, string> = {},
): Record<string, string> => {
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
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

export const findFilesMatchingGlob = (
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

export const createDataContextReplacements = (
  data: DataContext,
  folderPath: string,
): { augmentedData: DataContext; replacements: Record<string, string> } => {
  const folderNameParts = folderPath.split('/');
  const folderName = folderNameParts[folderNameParts.length - 1] ?? '';

  const augmentedData: DataContext = {
    ...data,
    folderName,
    folderPath,
    name: folderName,
  };

  const flattenedData = flattenData(augmentedData);
  const replacements: Record<string, string> = {};
  for (const [key, value] of Object.entries(flattenedData)) {
    replacements[key] = value;
  }

  return { augmentedData, replacements };
};
