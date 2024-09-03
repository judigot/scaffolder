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
  mockData: Record<string, Record<string, unknown>[]>;
  SQLInsertQueries: string;
  SQLInsertQueriesFromMockData: string;
  aggregateJoins: string[];
  getSchemaInfo: () => ISchemaInfo[];
  setIntrospectedSchema: (schemaInfo: ISchemaInfo[]) => void;
  setTransformations: () => void;
}

const errorMessage = 'An error occurred';

export const useTransformationsStore = create<IStore>((set, get) => ({
  interfaces: '',
  getParsedSchemaInput: () => {
    const { schemaInput } = useFormStore.getState().formData;
    return JSON5.parse(schemaInput);
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
  setTransformations: () => {
    const schemaInfo = get().getSchemaInfo();
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

    let mockData: Record<string, Record<string, unknown>[]> = {};
    try {
      mockData = generateMockData({
        mockDataRows: 5,
        schemaInfo,
      });
      set({ mockData });
    } catch (e) {
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
    } catch (e) {
      set({ interfaces: errorMessage });
    }

    let SQLInsertQueries = '';
    try {
      SQLInsertQueries = generateSQLInserts(parsedSchema);
      set({ SQLInsertQueries: formatSQL(SQLInsertQueries) });
    } catch (e) {
      set({ SQLInsertQueries: errorMessage });
    }

    let SQLInsertQueriesFromMockData = '';
    try {
      SQLInsertQueriesFromMockData = generateSQLInserts(mockData);
      set({
        SQLInsertQueriesFromMockData: formatSQL(SQLInsertQueriesFromMockData),
      });
    } catch (e) {
      set({ SQLInsertQueriesFromMockData: errorMessage });
    }

    let deleteTablesQueries: string[] = [];
    try {
      deleteTablesQueries = generateSQLDeleteTables(schemaInfo);
      set({ deleteTablesQueries });
    } catch (e) {
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
    } catch (e) {
      set({ SQLSchema: errorMessage });
    }

    let joins: string[] = [];
    try {
      joins = generateSQLJoins(schemaInfo);
      set({ joins });
    } catch (e) {
      set({ joins: [errorMessage] });
    }

    let aggregateJoins: string[] = [];
    try {
      aggregateJoins = generateSQLAggregateJoins(schemaInfo);
      set({ aggregateJoins });
    } catch (e) {
      set({ aggregateJoins: [errorMessage] });
    }
  },
}));

export default useTransformationsStore;
