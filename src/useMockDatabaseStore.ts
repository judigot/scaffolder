import type { IFile, IStructure, IFolder } from '@/components/FileViewer.tsx';
import { create } from 'zustand';
import { useProjectStore } from '@/useProjectStore.ts';
import equal from 'fast-deep-equal';
import yaml from 'yaml';
import { isRecord } from '@/utils/typeGuards.ts';
import { findProjectsFolderAtRoot } from '@/utils/project-builder/utils/findProjectsFolderAtRoot.ts';

interface IStore {
  userFiles: IStructure;
  projects: IFile[];
  typeMappings: Record<PropertyKey, unknown> | undefined;
  dbTypes: string[] | undefined;
  setUserFiles: (userFiles: IStructure) => void;
}

/*
 * Basic store without persisting
 */
export const useMockDatabaseStore = create<IStore>()((set, get) => ({
  userFiles: [],
  projects: [],

  typeMappings: undefined,
  dbTypes: undefined,

  /**
   * Updates user files and notifies useProjectStore
   */
  setUserFiles: (userFiles) => {
    const currentUserFiles = get().userFiles;

    // Find Constants folder and typeMappings.yaml file with proper type checking
    const constantsFolder = userFiles.find(
      (item): item is IFolder =>
        item.name === 'Constants' && item.type === 'folder',
    );

    let typeMappings: Record<string, unknown> | undefined;
    let dbTypes: string[] | undefined;
    if (constantsFolder) {
      const typeMappingsFile = constantsFolder.children.find(
        (child): child is IFile =>
          child.type === 'file' && child.name === 'typeMappings.yaml',
      );
      if (typeMappingsFile && typeMappingsFile.content.trim() !== '') {
        try {
          const parsedData: unknown = yaml.parse(typeMappingsFile.content);
          if (isRecord(parsedData)) {
            typeMappings = parsedData;
          }
        } catch (error) {
          console.error('Error parsing typeMappings.yaml:', error);
          typeMappings = undefined;
        }
      }

      const dbTypesFile = constantsFolder.children.find(
        (child): child is IFile =>
          child.type === 'file' && child.name === 'dbTypes.yaml',
      );
      if (dbTypesFile && dbTypesFile.content.trim() !== '') {
        try {
          const parsedData: unknown = yaml.parse(dbTypesFile.content);
          if (Array.isArray(parsedData)) {
            dbTypes = parsedData.filter(
              (item): item is string => typeof item === 'string',
            );
          }
        } catch (error) {
          console.error('Error parsing dbTypes.yaml:', error);
          dbTypes = undefined;
        }
      }
    }

    if (typeMappings !== undefined || dbTypes !== undefined) {
      set({
        ...(typeMappings !== undefined && { typeMappings }),
        ...(dbTypes !== undefined && { dbTypes }),
      });
    }

    // Check if there are actual changes using fast-deep-equal
    if (equal(currentUserFiles, userFiles)) {
      return;
    }

    // Extract projects from the userFiles
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

    // Update state with new files (even if no projects found - enables fallback viewer)
    set({
      userFiles,
      projects,
    });

    // Get the project store
    const projectStore = useProjectStore.getState();

    // Notify project store of the update (handles selectedProject reset when projects is empty)
    if (typeof projectStore.processFilesUpdate === 'function') {
      projectStore.processFilesUpdate(userFiles, projects);
    }
  },
}));
