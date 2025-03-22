import { IFile, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { useTransformationsStore } from '@/useTransformationsStore.ts';
import { buildProjectFiles } from '@/utils/buildProjectFiles.ts';
import { create } from 'zustand';
import { useFormStore } from '@/useFormStore.ts';

interface IStore {
  userFiles: IStructure;
  projectFiles: IStructure;
  projects: IFile[];
  setUserFiles: ({
    userFiles,
    schemaInfo,
  }: {
    userFiles: IStructure;
    schemaInfo: ISchemaInfo[];
  }) => void;
  // setProjectFiles: (schemaInfo: ISchemaInfo[]) => void;
}

/*
 * Basic store without persisting
 */
export const useMockDatabaseStore = create<IStore>()((set) => ({
  userFiles: [],
  projectFiles: [],
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

    if (currentProject == null && firstProject != null) {
      setProject(firstProject);
    }

    if (projectSelected == null) {
      throw new Error('No project could be selected to build project files');
    }

    const projectFiles = buildProjectFiles(
      `/Projects/${projectSelected.name}`,
      userFiles,
      schemaInfo,
    );

    set({
      userFiles,
      projects,
      projectFiles,
    });
  },
}));
