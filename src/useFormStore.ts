import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import { DBTypes, IJSONSchema, ISchemaInfo } from '@/interfaces/interfaces.ts';
import { SQLQueries } from '@/utils/mappings.ts';
import { CREATION_MODES } from '@/constants.ts';
import { manyToMany, oneToMany, oneToOne } from '@/schema-infos/index.ts';
import identifySchema from '@/utils/identifySchema.ts';
import {
  usersPostOneToOneSchema,
  usersPostsOneToManySchema,
  POSSchema,
} from '@/json-schemas/index.ts';

export const frameworks = {
  LARAVEL: 'Laravel',
  NEXTJS: 'Next.js',
  // SPRING_BOOT: 'Spring Boot',
} as const;

export interface IFormData {
  schemaInput: IJSONSchema;
  backendUrl: string;
  backendDir: string;
  frontendDir: string;
  dbConnection: string;
  framework: (typeof frameworks)[keyof typeof frameworks] | '';
  includeInsertData: boolean;
  insertOption: string;
  includeTypeGuards: boolean;
  outputOnSingleFile: boolean;
}

interface IFormStore {
  formData: IFormData;
  schemaInfo: ISchemaInfo[];
  dbType: DBTypes | undefined;
  quote: string;
  creationMode: (typeof CREATION_MODES)[keyof typeof CREATION_MODES];
  setSchemaInfo: (schemaInfo: ISchemaInfo[]) => void;
  setCreationMode: (
    creationMode: (typeof CREATION_MODES)[keyof typeof CREATION_MODES],
  ) => void;
  setFormData: (data: Partial<IFormData>) => void;
  setOneToOne: () => void;
  setOneToMany: () => void;
  setManyToMany: () => void;
  setDBType: (dbType: DBTypes) => void;
}

const initialFormData: IFormData = {
  schemaInput: usersPostOneToOneSchema,
  backendUrl: 'http://localhost:8000/api',
  backendDir: 'C:/Users/Jude/Desktop/laravel',
  // backendDir: 'C:/Users/Username/Desktop/app/backend',
  frontendDir: 'C:/Users/Jude/Desktop/laravel/frontend',
  // frontendDir: 'C:/Users/Username/Desktop/app/frontend',
  dbConnection: 'postgresql://root:123@localhost:5432/laravel',
  framework: frameworks.LARAVEL,
  includeInsertData: false,
  insertOption: 'SQLInsertQueries',
  includeTypeGuards: true,
  outputOnSingleFile: false,
};

function determineSQLDatabaseType(dbConnection: string): DBTypes {
  const dbType = extractDBConnectionInfo(dbConnection).dbType;
  return dbType;
}

export const useFormStore = create(
  persist<IFormStore>(
    (set, get) => {
      const initialDbType = determineSQLDatabaseType(
        initialFormData.dbConnection,
      );
      const initialQuote = SQLQueries.quote[initialDbType];

      return {
        formData: initialFormData,
        schemaInfo: manyToMany,
        dbType: initialDbType,
        quote: initialQuote,
        creationMode: CREATION_MODES.JSON_SCHEMA,
        setSchemaInfo: (schemaInfo) => {
          set({ schemaInfo });
        },
        setCreationMode: (creationMode) => {
          set({ creationMode });
        },
        setFormData: (data) => {
          set((state) => {
            const newDbConnection =
              data.dbConnection ?? state.formData.dbConnection;
            const newDbType = determineSQLDatabaseType(newDbConnection);

            return {
              formData: { ...state.formData, ...data },
              dbType: newDbType,
              quote: SQLQueries.quote[newDbType],
            };
          });

          const { schemaInput } = get().formData;
          const oldSchemaInfo = get().schemaInfo;
          const newSchemaInfo = identifySchema(schemaInput);

          // Prevent unnecessary transformations when schemaInfo is unchanged
          if (JSON.stringify(oldSchemaInfo) !== JSON.stringify(newSchemaInfo)) {
            set({ schemaInfo: newSchemaInfo });
          }
        },
        setOneToOne: () => {
          set((state) => ({
            formData: {
              ...state.formData,
              schemaInput: usersPostOneToOneSchema,
            },
            schemaInfo: oneToOne,
          }));

          if (get().creationMode === CREATION_MODES.JSON_SCHEMA) {
            //
          }

          if (get().creationMode === CREATION_MODES.SCHEMA_BUILDER) {
            //
          }
        },
        setOneToMany: () => {
          set((state) => ({
            formData: {
              ...state.formData,
              schemaInput: usersPostsOneToManySchema,
            },
            schemaInfo: oneToMany,
          }));

          if (get().creationMode === CREATION_MODES.JSON_SCHEMA) {
            //
          }

          if (get().creationMode === CREATION_MODES.SCHEMA_BUILDER) {
            //
          }
        },
        setManyToMany: () => {
          set((state) => ({
            formData: {
              ...state.formData,
              schemaInput: POSSchema,
            },
            schemaInfo: manyToMany,
          }));

          if (get().creationMode === CREATION_MODES.JSON_SCHEMA) {
            //
          }

          if (get().creationMode === CREATION_MODES.SCHEMA_BUILDER) {
            //
          }
        },
        setDBType: (dbType) => {
          set((state) => {
            let connectionString = state.formData.dbConnection;

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
              formData: {
                ...state.formData,
                dbConnection: connectionString,
              },
              dbType: newDbType,
              quote: newQuote,
            };
          });
        },
      };
    },
    {
      name: 'formData',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
