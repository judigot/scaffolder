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
  interfaces: Record<string, string>;
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
  interfaces: {},
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
        interfaces: {},
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
        interfaces: { errorMessage },
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

    if (schemaInfo.length === 0) {
      set({
        interfaces: {},
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

    const {
      includeInsertData,
      insertOption,
      includeTypeGuards,
      outputOnSingleFile,
    } = useFormStore.getState().formData;

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
        outputOnSingleFile,
      });
      set({ interfaces });
    } catch {
      set({ interfaces: { errorMessage } });
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
