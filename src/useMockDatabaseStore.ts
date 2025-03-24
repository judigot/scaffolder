import { IFile, IStructure } from '@/components/FileViewer.tsx';
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
    
    if (!('children' in projectsFolder) || !Array.isArray(projectsFolder.children)) {
      return;
    }
    
    // Extract project files
    const projects = projectsFolder.children.filter(
      (child): child is IFile => child.type === 'file',
    );
    
    // Update state with new files
    _set({
      userFiles,
      projects
    });
    
    // Get the project store
    const projectStore = useProjectStore.getState();
    
    // Verify processFilesUpdate exists before calling it
    if (typeof projectStore.processFilesUpdate === 'function') {
      projectStore.processFilesUpdate(userFiles, projects);
    }
  },
}));
