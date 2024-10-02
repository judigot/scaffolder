import { create } from 'zustand';
import { format as formatSQL } from 'sql-formatter';
import generateMockData from './utils/generateMockData';
import generateSQLInserts from './utils/generateSQLInserts';
import generateSQLJoins from '@/utils/generateSQLJoins';
import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables';
import identifySchema from '@/utils/identifySchema';
import { useFormStore } from './useFormStore';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces';
import JSON5 from 'json5';
import { ISchemaInfo, ParsedJSONSchema } from '@/interfaces/interfaces';
import generateSQLSchema from '@/utils/generateSQLSchema';

interface IStore {
  interfaces: string | Record<string, string>;
  getParsedSchemaInput: () => ParsedJSONSchema;
  SQLSchema: string;
  deleteTablesQueries: string[];
  joins: string[];
  mockData: ParsedJSONSchema;
  SQLInsertQueries: string;
  SQLInsertQueriesFromMockData: string;
  aggregateJoins: string[];
  getSchemaInfo: () => ISchemaInfo[];
  setIntrospectedSchema: (schemaInfo: ISchemaInfo[]) => void;
  setTransformations: (schemaInfo?: ISchemaInfo[] | null) => void;
}

const errorMessage = 'An error occurred';

export const useTransformationsStore = create<IStore>((set, get) => ({
  interfaces: '',
  getParsedSchemaInput: () => {
    const { schemaInput } = useFormStore.getState().formData;
    try {
      const result: ParsedJSONSchema = JSON5.parse(schemaInput);
      return result;
    } catch {
      return {};
    }
  },
  SQLSchema: '',
  deleteTablesQueries: [],
  joins: [],
  mockData: {},
  SQLInsertQueries: '',
  SQLInsertQueriesFromMockData: '',
  aggregateJoins: [],
  getSchemaInfo: () => {
    return identifySchema(get().getParsedSchemaInput());
  },
  setIntrospectedSchema: (schemaInfo) => {
    if (schemaInfo.length === 0) {
      set({
        interfaces: '',
        SQLSchema: '',
        deleteTablesQueries: [],
        joins: [],
        mockData: {},
        SQLInsertQueries: '',
        SQLInsertQueriesFromMockData: '',
        aggregateJoins: [],
      });
      return;
    }
    try {
      const parsedSchema = generateMockData({
        mockDataRows: 2,
        schemaInfo,
      });
      useFormStore.setState((state) => ({
        formData: {
          ...state.formData,
          schemaInput: JSON.stringify(parsedSchema, null, 2),
        },
      }));
    } catch {
      set({
        interfaces: errorMessage,
        SQLSchema: errorMessage,
        deleteTablesQueries: [errorMessage],
        joins: [errorMessage],
        mockData: {},
        SQLInsertQueries: errorMessage,
        SQLInsertQueriesFromMockData: errorMessage,
        aggregateJoins: [errorMessage],
      });
    }
  },
  setTransformations: (tempSchemaInfo?: ISchemaInfo[] | null) => {
    // If schemaInfo is not provided, get it from the current state
    const schemaInfo = tempSchemaInfo ?? get().getSchemaInfo();

    /* prettier-ignore */ (() => { const QuickLog = schemaInfo; const isObject = (obj: unknown): obj is Record<string, unknown> => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr: unknown): arr is Record<string, unknown>[] => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv: HTMLElement = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) { parentDiv.remove(); } }; helperButtonsDiv.appendChild(clearButton); document.body.appendChild(div); div.appendChild(helperButtonsDiv); return div; })(); const createTable = (obj: Record<string, unknown>): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; Object.entries(obj).forEach(([key, value]) => { const row = document.createElement('tr'); const keyCell = document.createElement('td'); const valueCell = document.createElement('td'); keyCell.textContent = key; valueCell.textContent = String(value); keyCell.style.cssText = 'border: 1px solid black; padding: 5px;'; valueCell.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(keyCell); row.appendChild(valueCell); table.appendChild(row); }); return table; }; const createTableFromArray = ( arr: Record<string, unknown>[], ): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; const headers = Object.keys(arr[0]); const headerRow = document.createElement('tr'); headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; th.style.cssText = 'border: 1px solid black; padding: 5px;'; headerRow.appendChild(th); }); table.appendChild(headerRow); arr.forEach((obj) => { const row = document.createElement('tr'); headers.forEach((header) => { const td = document.createElement('td'); td.textContent = String(obj[header]); td.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(td); }); table.appendChild(row); }); return table; }; const createChildDiv = (data: unknown): HTMLElement => { const newDiv = document.createElement('div'); const jsonData = JSON.stringify(data, null, 2); if (isArrayOfObjects(data)) { const table = createTableFromArray(data); newDiv.appendChild(table); } else if (isObject(data)) { const table = createTable(data); newDiv.appendChild(table); } else { newDiv.textContent = String(data); } newDiv.style.cssText = 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;'; const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div'); if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { void navigator.clipboard.writeText(jsonData).then(() => { clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }); } }; const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); if (!parentDiv.hasChildNodes()) { parentDiv.remove(); } } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv(QuickLog)); })();

    if (schemaInfo.length === 0) {
      set({
        interfaces: '',
        SQLSchema: '',
        deleteTablesQueries: [],
        joins: [],
        mockData: {},
        SQLInsertQueries: '',
        SQLInsertQueriesFromMockData: '',
        aggregateJoins: [],
      });
      return;
    }

    const { includeInsertData, insertOption, includeTypeGuards } =
      useFormStore.getState().formData;

    const parsedSchema = get().getParsedSchemaInput();

    let mockData: ParsedJSONSchema = {};
    try {
      mockData = generateMockData({
        mockDataRows: 5,
        schemaInfo,
      });
      set({ mockData });
    } catch {
      set({ mockData: {} });
    }

    let interfaces: string | Record<string, string> = '';
    try {
      interfaces = generateTypescriptInterfaces({
        schemaInfo,
        includeTypeGuards,
        outputOnSingleFile: false,
      });
      set({ interfaces });
    } catch {
      set({ interfaces: errorMessage });
    }

    let SQLInsertQueries = '';
    try {
      SQLInsertQueries = generateSQLInserts(parsedSchema);
      set({ SQLInsertQueries: formatSQL(SQLInsertQueries) });
    } catch {
      set({ SQLInsertQueries: errorMessage });
    }

    let SQLInsertQueriesFromMockData = '';
    try {
      SQLInsertQueriesFromMockData = generateSQLInserts(mockData);
      set({
        SQLInsertQueriesFromMockData: formatSQL(SQLInsertQueriesFromMockData),
      });
    } catch {
      set({ SQLInsertQueriesFromMockData: errorMessage });
    }

    let deleteTablesQueries: string[] = [];
    try {
      deleteTablesQueries = generateSQLDeleteTables(schemaInfo);
      set({ deleteTablesQueries });
    } catch {
      set({ deleteTablesQueries: [errorMessage] });
    }

    let SQLSchema = '';
    try {
      SQLSchema = generateSQLSchema(schemaInfo);

      if (includeInsertData) {
        if (insertOption === 'SQLInsertQueries') {
          SQLSchema += `\n\n${SQLInsertQueries}`;
        }

        if (insertOption === 'SQLInsertQueriesFromMockData') {
          SQLSchema += `\n\n${SQLInsertQueriesFromMockData}`;
        }
      }

      set({
        SQLSchema: `${deleteTablesQueries.join('\n')}\n\n${formatSQL(SQLSchema)}`,
      });
    } catch {
      set({ SQLSchema: errorMessage });
    }

    let joins: string[] = [];
    try {
      joins = generateSQLJoins(schemaInfo);
      set({ joins });
    } catch {
      set({ joins: [errorMessage] });
    }

    let aggregateJoins: string[] = [];
    try {
      aggregateJoins = generateSQLAggregateJoins(schemaInfo);
      set({ aggregateJoins });
    } catch {
      set({ aggregateJoins: [errorMessage] });
    }
  },
}));

export default useTransformationsStore;
