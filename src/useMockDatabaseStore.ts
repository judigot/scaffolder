import { IFile, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { useTransformationsStore } from '@/useTransformationsStore.ts';
import { buildProjectFiles } from '@/utils/buildProjectFiles.ts';
import { create } from 'zustand';
import { useFormStore } from '@/useFormStore.ts';

interface IStore {
  userFiles: IStructure;
  projects: IFile[];
  setUserFiles: ({
    userFiles,
    schemaInfo,
  }: {
    userFiles: IStructure;
    schemaInfo: ISchemaInfo[];
  }) => void;
}

/*
 * Basic store without persisting
 */
export const useMockDatabaseStore = create<IStore>()((set) => ({
  userFiles: [],
  projects: [],
  setUserFiles: ({ userFiles }: { userFiles: IStructure }) => {
    const { schemaInfo } = useTransformationsStore.getState();
    const { setProject, project: currentProject } = useFormStore.getState();

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
    });

    // If no project is selected yet but we have projects, select the first one
    if (currentProject == null && firstProject != null) {
      setProject(firstProject);
      return;
    }

    // If we have a selected project, update the projectFiles in useFormStore
    if (projectSelected) {
      const projectFiles = buildProjectFiles(
        `/Projects/${projectSelected.name}`,
        userFiles,
        schemaInfo,
      );

      // Update projectFiles in useFormStore
      useFormStore.setState({ projectFiles });
    }
  },
}));
