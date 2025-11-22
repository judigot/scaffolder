import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';

const findProjectFolder = (
  projectYamlPath: string,
  userFiles: IStructure,
): IFolder | null => {
  const normPath = projectYamlPath.startsWith('/')
    ? projectYamlPath.substring(1)
    : projectYamlPath;

  const projectsFolder = userFiles.find(
    (item): item is IFolder =>
      item.type === 'folder' && item.name === 'Projects',
  );

  if (!projectsFolder) {
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

/**
 * Loads core files from a project's core folder.
 * Core files are essential files merged with scaffolded files during generation.
 *
 * @param projectYamlPath - Path to structure.yaml (e.g., "/Projects/Express React/structure.yaml")
 * @param userFiles - Complete file structure
 * @returns Core files array, or empty if no core folder exists
 */
export const loadCoreFiles = (
  projectYamlPath: string,
  userFiles: IStructure,
): IStructure => {
  const projectFolder = findProjectFolder(projectYamlPath, userFiles);

  if (!projectFolder) {
    return [];
  }

  const coreFolder = projectFolder.children.find(
    (item): item is IFolder => item.type === 'folder' && item.name === 'core',
  );

  if (!coreFolder) {
    return [];
  }

  return coreFolder.children;
};
