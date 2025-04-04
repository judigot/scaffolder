import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IFile, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import equal from 'fast-deep-equal';

type IProjectBuildCache = IStructure;

export interface IProjectStore {
  projects: IFile[];
  selectedProject: IFile | null;
  projectBuildCache: Record<string, IProjectBuildCache>;
  selectProject: (project: IFile) => void;
  buildProjectFilesForProject: (
    project: IFile,
    schemaInfo: ISchemaInfo[],
  ) => IStructure;
  invalidateProjectCache: (projectName: string) => void;
  processFilesUpdate: (_userFiles: IStructure, projects: IFile[]) => void;
  updateProjects: (projects: IFile[]) => void;
}

const persistConfig = {
  name: 'project-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state: IProjectStore) => ({
    selectedProject: state.selectedProject,
    projectBuildCache: state.projectBuildCache,
  }),
};

const isUseCache = false;

export const useProjectStore = create<IProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedProject: null,
      projectBuildCache: {},

      /**
       * Selects a project
       */
      selectProject: (project: IFile) => {
        const currentProject = get().selectedProject;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!isUseCache) {
          // Invalidate the cache for the current project
          get().invalidateProjectCache(currentProject?.name ?? '');
        }

        // Only update if there's an actual change
        if (!currentProject || !equal(currentProject, project)) {
          set({ selectedProject: project });
        }
      },

      /**
       * Updates the list of projects and selects the first one if none is selected
       */
      updateProjects: (projects: IFile[]) => {
        const currentProjects = get().projects;

        // Only update if there's an actual change in the projects array
        if (!equal(currentProjects, projects)) {
          set({ projects });

          // Get current state
          const { selectedProject } = get();

          // If no project is selected or the selected project no longer exists, select the first one
          if (
            selectedProject === null ||
            !projects.some((p) => p.name === selectedProject.name)
          ) {
            if (projects.length > 0) {
              get().selectProject(projects[0]);
            } else {
              set({ selectedProject: null });
            }
          }
        }
      },

      /**
       * Invalidates the cache for a specific project
       */
      invalidateProjectCache: (projectName: string) => {
        set((state) => {
          const newCache = { ...state.projectBuildCache };
          if (Object.prototype.hasOwnProperty.call(newCache, projectName)) {
            // Use a safe way to delete property
            const { [projectName]: _, ...rest } = newCache;
            return { projectBuildCache: rest };
          }
          return { projectBuildCache: newCache };
        });
      },

      /**
       * Process incoming files update from useMockDatabaseStore
       */
      processFilesUpdate: (_userFiles: IStructure, projects: IFile[]) => {
        // Get current state including selected project
        const { selectedProject, projectBuildCache } = get();

        // Update our projects list first
        get().updateProjects(projects);

        // Check if any projects have been removed and clear their cache
        if (Object.keys(projectBuildCache).length > 0) {
          const existingProjectNames = projects.map((p) => p.name);
          const cachedProjectNames = Object.keys(projectBuildCache);

          // Find projects that are in cache but no longer exist
          const removedProjects = cachedProjectNames.filter(
            (name) => !existingProjectNames.includes(name),
          );

          // Invalidate cache for removed projects
          if (removedProjects.length > 0) {
            removedProjects.forEach((projectName) => {
              get().invalidateProjectCache(projectName);
            });
          }
        }

        // If we have a selected project but it's not in the updated projects list
        if (selectedProject !== null) {
          const stillExists = projects.some(
            (p) => p.name === selectedProject.name,
          );

          if (!stillExists) {
            // Select the first project if available
            if (projects.length > 0) {
              get().selectProject(projects[0]);
            } else {
              set({ selectedProject: null });
            }
          }
        } else if (projects.length > 0) {
          get().selectProject(projects[0]);
        }
      },

      /**
       * Builds the files for a project, using cache if available
       */
      buildProjectFilesForProject: (
        project: IFile,
        schemaInfo: ISchemaInfo[],
      ): IStructure => {
        const { projectBuildCache } = get();

        // Check if we have a cached version that matches the current schema version
        if (
          Object.prototype.hasOwnProperty.call(projectBuildCache, project.name)
        ) {
          return projectBuildCache[project.name];
        }
        // Get all user files
        const { userFiles: allUserFiles } = useMockDatabaseStore.getState();

        // Build project files using the project path
        // Use uniqueId if available, otherwise use the folder-based path
        const projectPath =
          project.uniqueId != null && String(project.uniqueId).length > 0
            ? String(project.uniqueId)
            : `/Projects/${String(project.name)}/structure.yaml`;
        const builtFiles = buildProjectFiles(
          projectPath,
          allUserFiles,
          schemaInfo,
        );

        // Update cache
        set((state) => ({
          projectBuildCache: {
            ...state.projectBuildCache,
            [project.name]: builtFiles,
          },
        }));

        return builtFiles;
      },
    }),
    persistConfig,
  ),
);
