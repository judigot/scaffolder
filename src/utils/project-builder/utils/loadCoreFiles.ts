import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import { mergeCoreFilesWithScaffolded } from './mergeCoreFiles.ts';
import { findProjectsFolderAtRoot } from './findProjectsFolderAtRoot.ts';

const findProjectFolder = (
  projectYamlPath: string,
  userFiles: IStructure,
): IFolder | null => {
  const normPath = projectYamlPath.startsWith('/')
    ? projectYamlPath.substring(1)
    : projectYamlPath;

  const projectsFolder = findProjectsFolderAtRoot(userFiles);

  if (projectsFolder === undefined) {
    return null;
  }

  for (const child of projectsFolder.children) {
    if (child.type === 'folder') {
      const structureFile = child.children.find(
        (file): file is IFile =>
          file.type === 'file' && file.name === 'structure.yaml',
      );

      if (structureFile) {
        const expectedPath = `Projects/${child.name}/structure.yaml`;
        if (normPath === expectedPath) {
          return child;
        }
      }
    }
  }

  return null;
};

const resolveCoreImport = (
  corePath: string,
  userFiles: IStructure,
): IStructure => {
  const normPath = corePath.startsWith('/') ? corePath.substring(1) : corePath;

  const pathComponents = normPath.split('/');
  let currentItems: IStructure = userFiles;

  for (const component of pathComponents) {
    const folder = currentItems.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === component,
    );

    if (!folder) {
      return [];
    }

    currentItems = folder.children;
  }

  return currentItems;
};

/**
 * Loads core files with support for core imports from structure.yaml
 *
 * Supports both single string and array formats:
 * - Single: `$USE_CORE: /Core/vite`
 * - Multiple: `$USE_CORE: [/Core/vite, /Core/extra]`
 *
 * Merge order (later wins):
 * 1. Core imports (in array order if array, or single import if string)
 * 2. Local core/ folder (highest priority - project-specific)
 *
 * Note: The core/ and Core/ folders are filtered from final output
 *
 * @param projectYamlPath - Path to structure.yaml
 * @param userFiles - Complete file structure
 * @returns Merged core files array
 */
export const loadCoreFiles = (
  projectYamlPath: string,
  userFiles: IStructure,
): IStructure => {
  const projectFolder = findProjectFolder(projectYamlPath, userFiles);

  if (!projectFolder) {
    return [];
  }

  const structureFile = projectFolder.children.find(
    (file): file is IFile =>
      file.type === 'file' && file.name === 'structure.yaml',
  );

  let mergedCores: IStructure = [];

  if (structureFile) {
    try {
      const parsed: unknown = parse(structureFile.content);

      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        '$USE_CORE' in parsed
      ) {
        const coreValue = parsed.$USE_CORE;

        let corePaths: string[] = [];

        if (typeof coreValue === 'string') {
          corePaths = [coreValue];
        } else if (Array.isArray(coreValue)) {
          corePaths = coreValue.filter(
            (item): item is string => typeof item === 'string',
          );
        }

        for (const corePath of corePaths) {
          const importedCore = resolveCoreImport(corePath, userFiles);
          mergedCores = mergeCoreFilesWithScaffolded(mergedCores, importedCore);
        }
      }
    } catch (error) {
      console.error('Error parsing structure.yaml for core imports:', error);
    }
  }

  const localCoreFolder = projectFolder.children.find(
    (item): item is IFolder => item.type === 'folder' && item.name === 'core',
  );

  if (localCoreFolder) {
    mergedCores = mergeCoreFilesWithScaffolded(
      mergedCores,
      localCoreFolder.children,
    );
  }

  return mergedCores;
};
