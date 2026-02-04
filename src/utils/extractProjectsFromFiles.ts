import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';
import { findProjectsFolderAtRoot } from '@/utils/project-builder/utils/findProjectsFolderAtRoot.ts';

/**
 * Extracts project definitions from a file structure.
 * This is a pure function that can be used synchronously in TanStack Query's select option.
 *
 * @param userFiles The file structure to extract projects from
 * @returns Array of project files
 */
export function extractProjectsFromFiles(userFiles: IStructure): IFile[] {
  const projectsFolder = findProjectsFolderAtRoot(userFiles);
  const projects: IFile[] = [];

  // Only extract projects if the Projects folder exists
  if (projectsFolder) {
    // 1. Extract project folders with structure.yaml (new approach)
    const projectFolders = projectsFolder.children.filter(
      (child): child is IFolder => child.type === 'folder',
    );

    for (const folder of projectFolders) {
      // Look for structure.yaml in each folder
      const structureFile = folder.children.find(
        (child): child is IFile =>
          child.type === 'file' && child.name === 'structure.yaml',
      );

      if (structureFile) {
        // Create a project file using the folder name as the project name
        projects.push({
          type: 'file',
          name: folder.name,
          content: structureFile.content,
          uniqueId: `/Projects/${folder.name}/structure.yaml`,
        });
      }
    }

    // 2. Extract direct YAML files in the Projects directory (legacy approach)
    const yamlFiles = projectsFolder.children.filter(
      (child): child is IFile =>
        child.type === 'file' && child.name.endsWith('.yaml'),
    );

    for (const yamlFile of yamlFiles) {
      projects.push({
        type: 'file',
        name: yamlFile.name.replace(/\.yaml$/, ''),
        content: yamlFile.content,
        uniqueId: `/Projects/${yamlFile.name}`,
      });
    }
  }

  // Sort projects alphabetically for consistent ordering
  projects.sort((a, b) => a.name.localeCompare(b.name));

  return projects;
}
