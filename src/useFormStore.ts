import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  setExample1: () => void;
  setExample2: () => void;
}

const example1SchemaInput = `{
  "user": [
    {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "username": "johndoe",
      "password": "$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m",
      "created_at": "2023-06-18T10:17:19.846Z",
      "updated_at": "2024-06-18T10:17:19.846Z"
    },
    {
      "user_id": 2,
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane.smith@example.com",
      "username": "janesmith",
      "password": "$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m",
      "created_at": "2024-06-18T10:17:19.846Z",
      "updated_at": "2024-06-18T10:17:19.846Z"
    }
  ],
  "post": [
    {
      "post_id": 1,
      "user_id": 1,
      "title": "John's Post",
      "content": "Lorem ipsum",
      "created_at": "2023-06-18T10:17:19.846Z",
      "updated_at": "2024-06-18T10:17:19.846Z"
    },
    {
      "post_id": 2,
      "user_id": 2,
      "title": "Jane's Post",
      "content": null,
      "created_at": "2024-06-18T10:17:19.846Z",
      "updated_at": "2024-06-18T10:17:19.846Z"
    }
  ]
}`;

const example2SchemaInput = `{
  "product": [
    {
      "product_id": 1,
      "product_name": "Water"
    },
    {
      "product_id": 2,
      "product_name": "Yogurt"
    }
  ],
  "customer": [
    {
      "customer_id": 1,
      "name": "John Doe"
    }
  ],
  "order": [
    {
      "order_id": 1,
      "customer_id": 1
    }
  ],
  "order_product": [
    {
      "order_product_id": 1,
      "order_id": 1,
      "product_id": 1
    },
    {
      "order_product_id": 2,
      "order_id": 1,
      "product_id": 2
    }
  ]
}`;

const initialFormData: IFormData = {
  schemaInput: example1SchemaInput,
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
      setExample1: () => {
        set((state) => ({
          formData: { ...state.formData, schemaInput: example1SchemaInput },
        }));
      },
      setExample2: () => {
        set((state) => ({
          formData: { ...state.formData, schemaInput: example2SchemaInput },
        }));
      },
    }),
    {
      name: 'formData',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
