import { IFile, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';
import { buildProjectFiles } from '@/utils/buildProjectFiles.ts';
import { create } from 'zustand';

interface IStore {
  userFiles: IStructure;
  projectFiles: IStructure;
  projects: IFile[];
  project: IFile | undefined;
  setProject: (project: IFile) => void;
  setUserFiles: ({
    userFiles,
    schemaInfo,
  }: {
    userFiles: IStructure;
    schemaInfo: ISchemaInfo[];
  }) => void;
  setProjectFiles: (schemaInfo: ISchemaInfo[]) => void;
}

/*
 * Basic store without persisting
 */
export const useMockDatabaseStore = create<IStore>()((set, get) => ({
  userFiles: [],
  projectFiles: [],
  projects: [],
  project: undefined,
  setProject: (project: IFile) => {
    const { schemaInfo } = useTransformationsStore.getState();
    const { userFiles } = get();
    set({
      project,
      projectFiles: buildProjectFiles(
        `/Projects/${project.name}`,
        userFiles,
        schemaInfo,
      ),
    });
  },
  setUserFiles: ({ userFiles: userFiles }: { userFiles: IStructure }) => {
    const { schemaInfo } = useTransformationsStore.getState();
    const { project } = get();
    const folderName = 'Projects';
    const objectIndex: number = userFiles.findIndex(
      (object): boolean => object.name === folderName,
    );
    if (objectIndex === -1) {
      throw new Error(`Folder ${folderName} not found`);
    }
    const projectsFolder = userFiles[objectIndex];
    if (
      !('children' in projectsFolder) ||
      !Array.isArray(projectsFolder.children)
    ) {
      throw new Error(`Folder ${folderName} is not a valid folder`);
    }
    const projects = projectsFolder.children.filter(
      (child): child is IFile => child.type === 'file',
    );
    if (!Array.isArray(projects)) {
      throw new Error(`Folder ${folderName} is not a valid folder`);
    }
    set({
      userFiles,
      projects,
      project: projects[0],
      projectFiles:
        project === undefined
          ? []
          : buildProjectFiles(
              `/Projects/${project.name}`,
              userFiles,
              schemaInfo,
            ),
    });
  },
  setProjectFiles: (schemaInfo: ISchemaInfo[]) => {
    const { userFiles } = get();
    set({
      projectFiles: buildProjectFiles(
        '/Projects/Laravel.yaml',
        userFiles,
        schemaInfo,
      ),
    });
  },
}));
