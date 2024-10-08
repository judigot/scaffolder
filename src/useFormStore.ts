import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';
import { POSSchema } from '@/json-schemas/POSSchema';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo';
import { DBTypes } from '@/interfaces/interfaces';

export const frameworks = {
  LARAVEL: 'Laravel',
  // NEXTJS: 'Next.js',
  // SPRING_BOOT: 'Spring Boot',
} as const;

export interface IFormData {
  schemaInput: string;
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
  dbType: DBTypes | undefined;
  quote: string;
  setFormData: (data: Partial<IFormData>) => void;
  setOneToOne: () => void;
  setOneToMany: () => void;
  setManyToMany: () => void;
  setDBType: (dbType: DBTypes) => void;
}

const usersPostOneToOneInput = JSON.stringify(usersPostOneToOneSchema, null, 4);
const usersPostOneToManyInput = JSON.stringify(
  usersPostsOneToManySchema,
  null,
  4,
);
const POSSchemaInput = JSON.stringify(POSSchema, null, 4);

const initialFormData: IFormData = {
  schemaInput: usersPostOneToOneInput,
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

function getQuote(dbType: DBTypes): string {
  const quotes: Record<DBTypes, string> = {
    postgresql: '"',
    mysql: '`',
  };
  return quotes[dbType];
}

function determineSQLDatabaseType(dbConnection: string): DBTypes {
  const dbType = extractDBConnectionInfo(dbConnection).dbType;
  return dbType;
}

export const useFormStore = create(
  persist<IFormStore>(
    (set) => {
      const initialDbType = determineSQLDatabaseType(
        initialFormData.dbConnection,
      );
      const initialQuote = getQuote(initialDbType);

      return {
        formData: initialFormData,
        dbType: initialDbType,
        quote: initialQuote,
        setFormData: (data) => {
          set((state) => {
            const newDbConnection =
              data.dbConnection ?? state.formData.dbConnection;
            const newDbType = determineSQLDatabaseType(newDbConnection);

            return {
              formData: { ...state.formData, ...data },
              dbType: newDbType,
              quote: getQuote(newDbType),
            };
          });
        },
        setOneToOne: () => {
          set((state) => ({
            formData: {
              ...state.formData,
              schemaInput: usersPostOneToOneInput,
            },
          }));
        },
        setOneToMany: () => {
          set((state) => ({
            formData: {
              ...state.formData,
              schemaInput: usersPostOneToManyInput,
            },
          }));
        },
        setManyToMany: () => {
          set((state) => ({
            formData: { ...state.formData, schemaInput: POSSchemaInput },
          }));
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
            const newQuote = getQuote(newDbType);

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
