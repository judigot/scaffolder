import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const frameworkKeys = {
  NEXTJS: 'NEXTJS',
  LARAVEL: 'LARAVEL',
  SPRING_BOOT: 'SPRING_BOOT',
} as const;

export const frameworks = {
  [frameworkKeys.NEXTJS]: 'Next.js',
  [frameworkKeys.LARAVEL]: 'Laravel',
  [frameworkKeys.SPRING_BOOT]: 'Spring Boot',
} as const;

interface IFormData {
  schemaInput: string;
  backendDir: string;
  frontendDir: string;
  dbConnection: string;
  framework: (typeof frameworks)[keyof typeof frameworks] | '';
}

interface IFormStore {
  formData: IFormData;
  setFormData: (data: Partial<IFormData>) => void;
  resetForm: () => void;
}

const defaultValues: IFormData = {
  schemaInput: `{
    "user": [
      {
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "username": "johndoe",
        "password": "$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m",
        "created_at": "2024-06-18T10:17:19.846Z",
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
        "created_at": "2024-06-18T10:17:19.846Z",
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
  }`,
  backendDir: 'C:/Users/Username/Desktop/app/backend',
  frontendDir: 'C:/Users/Username/Desktop/app/frontend',
  dbConnection: 'postgresql://root:123@localhost:5432/databasename',
  framework: frameworks[frameworkKeys.LARAVEL],
};

export const useFormStore = create(
  persist<IFormStore>(
    (set) => ({
      formData: defaultValues,
      setFormData: (data) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }));
      },
      resetForm: () => {
        set(() => ({ formData: defaultValues }));
      },
    }),
    {
      name: 'formData',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
