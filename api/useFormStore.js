import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { extractDBConnectionInfo } from './utils/extractDBConnectionInfo';
import { SQLQueries } from './utils/mappings';
import { CREATION_MODES } from './constants';
import { oneToOne, oneToMany, manyToMany } from './schema-infos';
import {
  usersPostOneToOneSchema,
  usersPostsOneToManySchema,
  POSSchema,
  masterJSONSchema,
} from './json-schemas';
import { useTransformationsStore } from './useTransformationsStore';
import { createTabSync } from './utils/createTabSync';
import masterSchema from './schema-infos/masterSchema';
export const frameworks = {
  LARAVEL: 'Laravel',
  NEXTJS: 'Next.js',
  // SPRING_BOOT: 'Spring Boot',
};
function determineSQLDatabaseType(dbConnection) {
  const dbType = extractDBConnectionInfo(dbConnection).dbType;
  return dbType;
}
function getDBConnectionInfo(dbConnection) {
  try {
    return extractDBConnectionInfo(dbConnection);
  } catch {
    return null;
  }
}
const persistConfig = {
  name: 'formData',
  storage: createJSONStorage(() => localStorage),
};
export const useFormStore = create()(
  persist((rawSet) => {
    const set = createTabSync('scaffolder-sync')(rawSet);
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
      setDbConnection: (connection) => {
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
      setPublicRepoURL: (url) => {
        set({
          publicRepoURL: url,
        });
      },
    };
  }, persistConfig),
);
