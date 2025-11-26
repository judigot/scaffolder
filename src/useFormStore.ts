import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type PersistOptions,
} from 'zustand/middleware';
import {
  extractDBConnectionInfo,
  type IDBConnectionInfo,
} from '@/utils/extractDBConnectionInfo.ts';
import type { DBTypes, IJSONSchema } from '@/interfaces/interfaces.ts';
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

export const frameworks = {
  LARAVEL: 'Laravel',
  NEXTJS: 'Next.js',
  // SPRING_BOOT: 'Spring Boot',
} as const;

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
  dbUsername: string;
  dbPassword: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  setCreationMode: (
    creationMode: (typeof CREATION_MODES)[keyof typeof CREATION_MODES],
  ) => void;
  setMasterSchema: () => void;
  setOneToOne: () => void;
  setOneToMany: () => void;
  setManyToMany: () => void;
  setDBType: (dbType: DBTypes) => void;
  setPublicRepoURL: (url: string) => void;
  setDbConnection: (connection: string) => void;
}

function determineSQLDatabaseType(dbConnection: string): DBTypes {
  const dbType = extractDBConnectionInfo(dbConnection).dbType;
  return dbType;
}

function getDBConnectionInfo(dbConnection: string): IDBConnectionInfo | null {
  try {
    return extractDBConnectionInfo(dbConnection);
  } catch {
    return null;
  }
}

const persistConfig: PersistOptions<IFormStore, unknown> = {
  name: 'formData',
  storage: createJSONStorage(() => localStorage),
};

export const useFormStore = create<IFormStore>()(
  persist((rawSet) => {
    const set = createTabSync<IFormStore>('scaffolder-sync')(rawSet);

    const initialDbConnection = 'postgresql://root:123@localhost:5432/laravel';
    const initialDbType = determineSQLDatabaseType(initialDbConnection);
    const initialQuote = SQLQueries.quote[initialDbType];
    const initialDbInfo = getDBConnectionInfo(initialDbConnection);

    return {
      schemaInput: masterJSONSchema,
      backendUrl: (() => {
        const backendHost = String(import.meta.env.VITE_BACKEND_HOST ?? '');
        const port = String(import.meta.env.VITE_BACKEND_PORT ?? '5000');
        const apiPath = String(import.meta.env.VITE_API_URL ?? 'api');
        const backendUrl = backendHost ? `${backendHost}:${port}` : '';
        return backendUrl ? `${backendUrl}/${apiPath}` : `/${apiPath}`;
      })(),
      backendDir: 'C:/Users/Jude/Desktop/laravel',
      // backendDir: 'C:/Users/Username/Desktop/app/backend',
      frontendDir: 'C:/Users/Jude/Desktop/laravel/frontend',
      // frontendDir: 'C:/Users/Username/Desktop/app/frontend',
      dbConnection: initialDbConnection,
      framework: frameworks.LARAVEL,
      includeInsertData: true,
      insertOption: 'SQLInsertQueriesFromMockData',
      includeTypeGuards: true,
      outputOnSingleFile: false,
      dbType: initialDbType,
      quote: initialQuote,
      publicRepoURL: 'https://github.com/judigot/scaffolder-files',
      clientID: '',
      clientSecret: '',
      creationMode: CREATION_MODES.SCHEMA_BUILDER,
      dbUsername: initialDbInfo?.username ?? '',
      dbPassword: initialDbInfo?.password ?? '',
      dbHost: initialDbInfo?.host ?? '',
      dbPort: initialDbInfo?.port ?? 0,
      dbName: initialDbInfo?.dbName ?? '',
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
          const dbInfo = getDBConnectionInfo(connectionString);

          return {
            dbConnection: connectionString,
            dbType: newDbType,
            quote: newQuote,
            dbUsername: dbInfo?.username ?? '',
            dbPassword: dbInfo?.password ?? '',
            dbHost: dbInfo?.host ?? '',
            dbPort: dbInfo?.port ?? 0,
            dbName: dbInfo?.dbName ?? '',
          };
        });
      },
      setDbConnection: (connection: string) => {
        set(() => {
          const dbType = determineSQLDatabaseType(connection);
          const quote = SQLQueries.quote[dbType];
          const dbInfo = getDBConnectionInfo(connection);

          return {
            dbConnection: connection,
            dbType,
            quote,
            dbUsername: dbInfo?.username ?? '',
            dbPassword: dbInfo?.password ?? '',
            dbHost: dbInfo?.host ?? '',
            dbPort: dbInfo?.port ?? 0,
            dbName: dbInfo?.dbName ?? '',
          };
        });
      },
      setPublicRepoURL: (url: string) => {
        set({
          publicRepoURL: url,
        });
      },
    };
  }, persistConfig),
);
