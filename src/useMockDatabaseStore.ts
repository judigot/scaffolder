import { IFile, IStructure } from '@/components/FileViewer.tsx';
import { create } from 'zustand';
import { useFormStore } from '@/useFormStore.ts';
import equal from 'fast-deep-equal';

interface IStore {
  userFiles: IStructure;
  projects: IFile[];
  previousUserFiles: IStructure | null;
  setUserFiles: (params: { 
    userFiles: IStructure;
  }) => void;
  userFilesChanged: (userFiles: IStructure) => boolean;
}

/*
 * Basic store without persisting
 */
export const useMockDatabaseStore = create<IStore>()((set, get) => ({
  userFiles: [],
  projects: [],
  previousUserFiles: null,

  /**
   * Checks if userFiles has changed by performing a deep comparison
   */
  userFilesChanged: (userFiles: IStructure): boolean => {
    const { previousUserFiles } = get();
    // Fast deep comparison to detect changes
    return !equal(previousUserFiles, userFiles);
  },

  /**
   * Sets the user files data from GitHub and updates the project selection
   */
  setUserFiles: ({ userFiles }: { 
    userFiles: IStructure;
  }) => {
    const { setProject, project: currentProject } = useFormStore.getState();
    const { previousUserFiles } = get();
    
    // Check if the user files have actually changed
    const hasChanged = !equal(previousUserFiles, userFiles);

    const projectsFolder = userFiles.find(
      (item) => item.name === 'Projects' && 'children' in item,
    );

    const projectsFolderFound = projectsFolder != null;
    if (!projectsFolderFound) {
      throw new Error(`"Projects" folder not found`);
    }

    const projectsFolderHasChildren =
      'children' in projectsFolder && Array.isArray(projectsFolder.children);
    if (!projectsFolderHasChildren) {
      throw new Error(`"Projects" folder does not contain valid children`);
    }

    const projects = projectsFolder.children.filter(
      (child): child is IFile => child.type === 'file',
    );

    const firstProjectExists = projects.length > 0;
    const firstProject = firstProjectExists ? projects[0] : null;
    const projectSelected = currentProject ?? firstProject;

    // Update the userFiles and projects in this store
    set({
      userFiles,
      projects,
      previousUserFiles: userFiles,
    });

    // If no project is selected yet but we have projects, select the first one
    if (currentProject == null && firstProject != null) {
      setProject(firstProject);
      return;
    }

    // If we have a selected project and the userFiles have changed,
    // tell useFormStore to update the selected project
    if (projectSelected && hasChanged) {
      setProject(projectSelected);
    }
  },
}));
