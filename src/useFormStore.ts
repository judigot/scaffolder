import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import { DBTypes, IJSONSchema } from '@/interfaces/interfaces.ts';
import { SQLQueries } from '@/utils/mappings.ts';
import { CREATION_MODES } from '@/constants.ts';
import { oneToOne, oneToMany, manyToMany } from '@/schema-infos/index.ts';
import {
  usersPostOneToOneSchema,
  usersPostsOneToManySchema,
  POSSchema,
  masterJSONSchema,
} from '@/json-schemas/index.ts';
import { useTransformationsStore } from '@/useTransformationsStore.ts';
import { createTabSync } from '@/utils/createTabSync.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import { IFile, IStructure } from '@/components/FileViewer.tsx';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { buildProjectFiles } from '@/utils/buildProjectFiles.ts';

// Debug utility to avoid linter errors with console.log
const isDevEnvironment = process.env.NODE_ENV === 'development';
const debugLog = (message: string): void => {
  if (isDevEnvironment) {
    // Using console warn to comply with linter rules
    console.warn(`[DEBUG] ${message}`);
  }
};

export const frameworks = {
  LARAVEL: 'Laravel',
  NEXTJS: 'Next.js',
  // SPRING_BOOT: 'Spring Boot',
} as const;

// export interface IFormData {
//   schemaInput: IJSONSchema;
//   backendUrl: string;
//   backendDir: string;
//   frontendDir: string;
//   dbConnection: string;
//   framework: (typeof frameworks)[keyof typeof frameworks] | '';
//   includeInsertData: boolean;
//   insertOption: 'SQLInsertQueries' | 'SQLInsertQueriesFromMockData';
//   includeTypeGuards: boolean;
//   outputOnSingleFile: boolean;
// }

export interface IFormStore extends Record<PropertyKey, unknown> {
  schemaInput: IJSONSchema;
  backendUrl: string;
  backendDir: string;
  frontendDir: string;
  dbConnection: string;
  framework: (typeof frameworks)[keyof typeof frameworks] | '';
  includeInsertData: boolean;
  insertOption: 'SQLInsertQueries' | 'SQLInsertQueriesFromMockData';
  includeTypeGuards: boolean;
  outputOnSingleFile: boolean;
  dbType: DBTypes | undefined;
  quote: string;
  publicRepoURL: string;
  clientID: string;
  clientSecret: string;
  creationMode: (typeof CREATION_MODES)[keyof typeof CREATION_MODES];
  setCreationMode: (
    creationMode: (typeof CREATION_MODES)[keyof typeof CREATION_MODES],
  ) => void;
  setMasterSchema: () => void;
  setOneToOne: () => void;
  setOneToMany: () => void;
  setManyToMany: () => void;
  setDBType: (dbType: DBTypes) => void;
  project: IFile | undefined;
  projectFiles: IStructure;
  projectBuildCache: Record<string, IStructure | null>;
  setProjectName: (projectName: string) => void;
  setPublicRepoURL: (url: string) => void;
  setProject: (project: IFile) => void;
}

function determineSQLDatabaseType(dbConnection: string): DBTypes {
  const dbType = extractDBConnectionInfo(dbConnection).dbType;
  return dbType;
}

const persistConfig: PersistOptions<IFormStore, unknown> = {
  name: 'formData',
  storage: createJSONStorage(() => localStorage),
};

export const useFormStore = create<IFormStore>()(
  persist((rawSet, _get) => {
    const set = createTabSync<IFormStore>('scaffolder-sync')(rawSet);

    const initialDbType = determineSQLDatabaseType(
      'postgresql://root:123@localhost:5432/laravel',
    );
    const initialQuote = SQLQueries.quote[initialDbType];

    return {
      schemaInput: masterJSONSchema,
      backendUrl: 'http://localhost:8000/api',
      backendDir: 'C:/Users/Jude/Desktop/laravel',
      // backendDir: 'C:/Users/Username/Desktop/app/backend',
      frontendDir: 'C:/Users/Jude/Desktop/laravel/frontend',
      // frontendDir: 'C:/Users/Username/Desktop/app/frontend',
      dbConnection: 'postgresql://root:123@localhost:5432/laravel',
      framework: frameworks.LARAVEL,
      includeInsertData: true,
      insertOption: 'SQLInsertQueriesFromMockData',
      includeTypeGuards: true,
      outputOnSingleFile: false,
      dbType: initialDbType,
      quote: initialQuote,
      publicRepoURL: '',
      clientID: '',
      clientSecret: '',
      creationMode: CREATION_MODES.SCHEMA_BUILDER,
      projectFiles: [],
      project: undefined,
      projectBuildCache: {},
      setCreationMode: (creationMode) => {
        set({ creationMode });
      },
      setMasterSchema: () => {
        set({ schemaInput: masterJSONSchema });
        useTransformationsStore.getState().setSchemaInfo(masterSchema);
      },
      setOneToOne: () => {
        set({ schemaInput: usersPostOneToOneSchema });
        useTransformationsStore.getState().setSchemaInfo(oneToOne);
      },
      setOneToMany: () => {
        set({ schemaInput: usersPostsOneToManySchema });
        useTransformationsStore.getState().setSchemaInfo(oneToMany);
      },
      setManyToMany: () => {
        set({ schemaInput: POSSchema });
        useTransformationsStore.getState().setSchemaInfo(manyToMany);
      },
      setDBType: (dbType) => {
        set((state) => {
          let connectionString = state.dbConnection;

          switch (dbType) {
            case 'postgresql':
              connectionString = connectionString
                .replace(/^\w+:\/\//, 'postgresql://')
                .replace(/:\d+\//, ':5432/');
              break;
            case 'mysql':
              connectionString = connectionString
                .replace(/^\w+:\/\//, 'mysql://')
                .replace(/:\d+\//, ':3306/');
              break;
            default:
              throw new Error(`Unsupported database type: ${String(dbType)}`);
          }

          const newDbType = determineSQLDatabaseType(connectionString);
          const newQuote = SQLQueries.quote[newDbType];

          return {
            dbConnection: connectionString,
            dbType: newDbType,
            quote: newQuote,
          };
        });
      },
      setProjectName: (projectName: string) => {
        set({
          publicRepoURL: `https://github.com/laravel/${projectName}`,
        });
      },
      setPublicRepoURL: (url: string) => {
        set({
          publicRepoURL: url,
        });
      },
      setProject: (project: IFile) => {
        const { schemaInfo } = useTransformationsStore.getState();
        const { userFiles } = useMockDatabaseStore.getState();

        set((state) => {
          // Check if we have a cached version of this project's file structure
          const cachedProjectFiles = state.projectBuildCache[project.name];

          let projectFiles: IStructure;

          if (cachedProjectFiles) {
            // Use cached version if available
            debugLog(`Using cached project files for: ${project.name}`);
            projectFiles = cachedProjectFiles;
          } else {
            // Calculate new structure if not in cache
            debugLog(`Building project files for: ${project.name}`);
            projectFiles = buildProjectFiles(
              `/Projects/${project.name}`,
              userFiles,
              schemaInfo,
            );

            // Update cache with the new structure
            state.projectBuildCache[project.name] = projectFiles;
          }

          return {
            project,
            projectFiles,
            projectBuildCache: {
              ...state.projectBuildCache,
              [project.name]: projectFiles,
            },
          };
        });
      },
    };
  }, persistConfig),
);
