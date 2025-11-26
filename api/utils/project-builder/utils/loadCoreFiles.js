import { parse } from 'yaml';
import { mergeCoreFilesWithScaffolded } from './mergeCoreFiles';
const findProjectFolder = (projectYamlPath, userFiles) => {
  const normPath = projectYamlPath.startsWith('/')
    ? projectYamlPath.substring(1)
    : projectYamlPath;
  const projectsFolder = userFiles.find(
    (item) => item.type === 'folder' && item.name === 'Projects',
  );
  if (!projectsFolder) {
    return null;
  }
  for (const child of projectsFolder.children) {
    if (child.type === 'folder') {
      const structureFile = child.children.find(
        (file) => file.type === 'file' && file.name === 'structure.yaml',
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
const resolveCoreImport = (corePath, userFiles) => {
  const normPath = corePath.startsWith('/') ? corePath.substring(1) : corePath;
  const pathComponents = normPath.split('/');
  let currentItems = userFiles;
  for (const component of pathComponents) {
    const folder = currentItems.find(
      (item) => item.type === 'folder' && item.name === component,
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
export const loadCoreFiles = (projectYamlPath, userFiles) => {
  const projectFolder = findProjectFolder(projectYamlPath, userFiles);
  if (!projectFolder) {
    return [];
  }
  const structureFile = projectFolder.children.find(
    (file) => file.type === 'file' && file.name === 'structure.yaml',
  );
  let mergedCores = [];
  if (structureFile) {
    try {
      const parsed = parse(structureFile.content);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        '$USE_CORE' in parsed
      ) {
        const coreValue = parsed.$USE_CORE;
        let corePaths = [];
        if (typeof coreValue === 'string') {
          corePaths = [coreValue];
        } else if (Array.isArray(coreValue)) {
          corePaths = coreValue.filter((item) => typeof item === 'string');
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
    (item) => item.type === 'folder' && item.name === 'core',
  );
  if (localCoreFolder) {
    mergedCores = mergeCoreFilesWithScaffolded(
      mergedCores,
      localCoreFolder.children,
    );
  }
  return mergedCores;
};
