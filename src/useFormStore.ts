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
import { useTransformationsStore } from '@/useTransformationsStore.ts';

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
  includeInsertData: true,
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

      // Subscribe to changes in schemaInfo and formData
      const subscribeToChanges = () => {
        /*prettier-ignore*/ (($= 'Hello, World!') => { const isObject = (obj: unknown): obj is Record<string, unknown> => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr: unknown): arr is Record<string, unknown>[] => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv: HTMLElement = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) { parentDiv.remove(); } }; helperButtonsDiv.appendChild(clearButton); document.body.appendChild(div); div.appendChild(helperButtonsDiv); return div; })(); const createTable = (obj: Record<string, unknown>): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; Object.entries(obj).forEach(([key, value]) => { const row = document.createElement('tr'); const keyCell = document.createElement('td'); const valueCell = document.createElement('td'); keyCell.textContent = key; valueCell.textContent = String(value); keyCell.style.cssText = 'border: 1px solid black; padding: 5px;'; valueCell.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(keyCell); row.appendChild(valueCell); table.appendChild(row); }); return table; }; const createTableFromArray = ( arr: Record<string, unknown>[], ): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; const headers = Object.keys(arr[0]); const headerRow = document.createElement('tr'); headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; th.style.cssText = 'border: 1px solid black; padding: 5px;'; headerRow.appendChild(th); }); table.appendChild(headerRow); arr.forEach((obj) => { const row = document.createElement('tr'); headers.forEach((header) => { const td = document.createElement('td'); td.textContent = String(obj[header]); td.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(td); }); table.appendChild(row); }); return table; }; const createChildDiv = (data: unknown): HTMLElement => { const newDiv = document.createElement('div'); const jsonData = JSON.stringify(data, null, 2); if (isArrayOfObjects(data)) { const table = createTableFromArray(data); newDiv.appendChild(table); } else if (isObject(data)) { const table = createTable(data); newDiv.appendChild(table); } else { newDiv.textContent = String(data); } newDiv.style.cssText = 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;'; const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div'); if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { void navigator.clipboard.writeText(jsonData).then(() => { clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }); } }; const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); if (!parentDiv.hasChildNodes()) { parentDiv.remove(); } } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv($)); })();
        const { setTransformations } = useTransformationsStore.getState();
        const { schemaInfo } = get();
        setTransformations(schemaInfo);
      };

      return {
        formData: initialFormData,
        schemaInfo: oneToOne,
        dbType: initialDbType,
        quote: initialQuote,
        creationMode: CREATION_MODES.JSON_SCHEMA,
        setSchemaInfo: (schemaInfo) => {
          set({ schemaInfo });
          subscribeToChanges();
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
            get().setSchemaInfo(newSchemaInfo);
          }
        },
        setOneToOne: () => {
          set((state) => ({
            formData: {
              ...state.formData,
              schemaInput: usersPostOneToOneSchema,
            },
          }));
          get().setSchemaInfo(oneToOne);
        },
        setOneToMany: () => {
          set((state) => ({
            formData: {
              ...state.formData,
              schemaInput: usersPostsOneToManySchema,
            },
          }));
          get().setSchemaInfo(oneToMany);
        },
        setManyToMany: () => {
          set((state) => ({
            formData: {
              ...state.formData,
              schemaInput: POSSchema,
            },
          }));
          get().setSchemaInfo(manyToMany);
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
          subscribeToChanges();
        },
      };
    },
    {
      name: 'formData',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
