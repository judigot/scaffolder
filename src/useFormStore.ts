import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';
import { POSSchema } from '@/json-schemas/POSSchema';

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
}

interface IFormStore {
  formData: IFormData;
  dbType: 'postgresql' | 'mysql' | '';
  quote: string;
  setFormData: (data: Partial<IFormData>) => void;
  setOneToOne: () => void;
  setOneToMany: () => void;
  setManyToMany: () => void;
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
  backendDir: 'C:/Users/Username/Desktop/app/backend',
  frontendDir: 'C:/Users/Username/Desktop/app/frontend',
  dbConnection: 'postgresql://root:123@localhost:5432/laravel',
  framework: frameworks.LARAVEL,
  includeInsertData: false,
  insertOption: 'SQLInsertQueries',
  includeTypeGuards: true,
};

function determineSQLDatabaseType(
  dbConnection: string,
): 'postgresql' | 'mysql' | '' {
  if (dbConnection.startsWith('postgresql')) {
    return 'postgresql';
  }
  if (dbConnection.startsWith('mysql')) {
    return 'mysql';
  }
  return '';
}

function getQuote(dbType: 'postgresql' | 'mysql' | ''): string {
  const quotes: Record<'postgresql' | 'mysql', string> = {
    postgresql: '"',
    mysql: '`',
  };
  return dbType ? quotes[dbType] : '';
}

export const useFormStore = create(
  persist<IFormStore>(
    (set) => ({
      formData: initialFormData,
      dbType: determineSQLDatabaseType(initialFormData.dbConnection),
      quote: getQuote(determineSQLDatabaseType(initialFormData.dbConnection)),
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
          formData: { ...state.formData, schemaInput: usersPostOneToOneInput },
        }));
      },
      setOneToMany: () => {
        set((state) => ({
          formData: { ...state.formData, schemaInput: usersPostOneToManyInput },
        }));
      },
      setManyToMany: () => {
        set((state) => ({
          formData: { ...state.formData, schemaInput: POSSchemaInput },
        }));
      },
    }),
    {
      name: 'formData',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
