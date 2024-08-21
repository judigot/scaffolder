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
import { ISchemaInfo } from '@/interfaces/interfaces';
import generateSQLSchema from '@/utils/generateSQLSchema';

interface IStore {
  interfaces: string | Record<string, string>;
  getParsedSchemaInput: () => Record<string, Record<string, unknown>[]>;
  SQLSchema: string;
  deleteTablesQueries: string[];
  joins: string[];
  mockData: Record<string, unknown[]>;
  SQLInsertQueries: string;
  SQLInsertQueriesFromMockData: string;
  aggregateJoins: string[];
  getSchemaInfo: () => ISchemaInfo[];
  setIntrospectedSchema: (schemaInfo: ISchemaInfo[]) => void;
  setTransformations: () => void;
}

export const useTransformationsStore = create<IStore>((set, get) => ({
  interfaces: '',
  getParsedSchemaInput: () => {
    const { schemaInput } = useFormStore.getState().formData;
    const parsedSchema: Record<string, Record<string, unknown>[]> =
      JSON5.parse(schemaInput);
    return parsedSchema;
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
    } catch (e) {
      set({
        interfaces: 'Invalid schema',
        SQLSchema: 'Invalid schema',
        deleteTablesQueries: ['Invalid schema'],
        joins: ['Invalid schema'],
        mockData: {},
        SQLInsertQueries: 'Invalid schema',
        SQLInsertQueriesFromMockData: 'Invalid schema',
        aggregateJoins: ['Invalid schema'],
      });
    }
  },
  setTransformations: () => {
    const schemaInfo = get().getSchemaInfo();
    /* prettier-ignore */ (() => { const QuickLog = JSON.stringify(schemaInfo, null, 4); const parentDiv = document.getElementById('quicklogContainer') ?? (() => {const div = document.createElement('div');div.id = 'quicklogContainer';div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end;';document.body.appendChild(div);return div; })(); const createChildDiv = (text: typeof QuickLog) => {const newDiv = Object.assign(document.createElement('div'), { textContent: text, style: 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer;',});const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div');if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { const textArea = document.createElement('textarea'); textArea.value = clickedDiv.textContent ?? ''; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }};const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); }};newDiv.addEventListener('mousedown', handleMouseDown);newDiv.addEventListener('contextmenu', handleRightClick);return newDiv; };parentDiv.prepend(createChildDiv(QuickLog)); })()
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

    try {
      const parsedSchema = get().getParsedSchemaInput();
      const mockData = generateMockData({
        mockDataRows: 5,
        schemaInfo,
      });

      const interfaces = generateTypescriptInterfaces({
        schemaInfo,
        includeTypeGuards,
        outputOnSingleFile: false,
      });

      const SQLInsertQueries = generateSQLInserts(parsedSchema);
      const SQLInsertQueriesFromMockData = generateSQLInserts(mockData);
      const deleteTablesQueries = generateSQLDeleteTables(schemaInfo);

      const SQLSchema = (() => {
        let sqlContent = generateSQLSchema(schemaInfo);

        if (includeInsertData) {
          if (insertOption === 'SQLInsertQueries') {
            sqlContent += `\n\n${SQLInsertQueries}`;
          }

          if (insertOption === 'SQLInsertQueriesFromMockData') {
            sqlContent += `\n\n${SQLInsertQueriesFromMockData}`;
          }
        }

        return `${String(deleteTablesQueries.join('\n'))}\n\n${formatSQL(sqlContent)}`;
      })();

      set({
        interfaces,
        SQLSchema,
        deleteTablesQueries,
        joins: generateSQLJoins(schemaInfo),
        mockData,
        SQLInsertQueries: formatSQL(SQLInsertQueries),
        SQLInsertQueriesFromMockData: formatSQL(SQLInsertQueriesFromMockData),
        aggregateJoins: generateSQLAggregateJoins(schemaInfo),
      });
    } catch (e) {
      set({
        interfaces: 'Invalid schema',
        SQLSchema: 'Invalid schema',
        deleteTablesQueries: ['Invalid schema'],
        joins: ['Invalid schema'],
        mockData: {},
        SQLInsertQueries: 'Invalid schema',
        SQLInsertQueriesFromMockData: 'Invalid schema',
        aggregateJoins: ['Invalid schema'],
      });
    }
  },
}));

export default useTransformationsStore;
