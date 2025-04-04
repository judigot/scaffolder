import { IFile, IStructure, IFolder } from '@/components/FileViewer.tsx';
import { create } from 'zustand';
import { useProjectStore } from '@/useProjectStore.ts';
import equal from 'fast-deep-equal';

interface IStore {
  userFiles: IStructure;
  projects: IFile[];
  setUserFiles: (userFiles: IStructure) => void;
}

/*
 * Basic store without persisting
 */
export const useMockDatabaseStore = create<IStore>()((_set, get) => ({
  userFiles: [],
  projects: [],

  /**
   * Updates user files and notifies useProjectStore
   */
  setUserFiles: (userFiles) => {
    const currentUserFiles = get().userFiles;

    // Check if there are actual changes using fast-deep-equal
    if (equal(currentUserFiles, userFiles)) {
      return;
    }

    // Extract projects from the userFiles
    const projectsFolder = userFiles.find(
      (item) => item.name === 'Projects' && 'children' in item,
    );

    // Validate the Projects folder
    if (!projectsFolder) {
      return;
    }

    if (
      !('children' in projectsFolder) ||
      !Array.isArray(projectsFolder.children)
    ) {
      return;
    }

    const projects: IFile[] = [];

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

    // Update state with new files
    _set({
      userFiles,
      projects,
    });

    // Get the project store
    const projectStore = useProjectStore.getState();

    // Verify processFilesUpdate exists before calling it
    if (typeof projectStore.processFilesUpdate === 'function') {
      projectStore.processFilesUpdate(userFiles, projects);
    }
  },
}));
