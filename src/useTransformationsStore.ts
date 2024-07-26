import { create } from 'zustand';
import { format as formatSQL } from 'sql-formatter';
import generateMockData from './utils/generateMockData';
import generateSQLInserts from './utils/generateSQLInserts';
import generateSQLJoins from '@/utils/generateSQLJoins';
import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables';
import identifyRelationships from '@/utils/identifyRelationships';
import { useFormStore } from './useFormStore';
import generateFile from '@/utils/generateFile';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces';
import JSON5 from 'json5';
import { IRelationshipInfo } from '@/interfaces/interfaces';

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
  getSchemaInfo: () => IRelationshipInfo[];
  setIntrospectedSchema: (schemaInfo: IRelationshipInfo[]) => void;
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
    return identifyRelationships(get().getParsedSchemaInput());
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
        relationships: schemaInfo,
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
        relationships: schemaInfo,
      });

      const interfaces = generateTypescriptInterfaces({
        relationships: schemaInfo,
        includeTypeGuards,
        outputOnSingleFile: false,
      });

      const SQLInsertQueries = generateSQLInserts(parsedSchema);
      const SQLInsertQueriesFromMockData = generateSQLInserts(mockData);

      const SQLSchema = (() => {
        let sqlContent = generateFile(schemaInfo, 'sql-tables');

        if (includeInsertData) {
          if (insertOption === 'SQLInsertQueries') {
            sqlContent += `\n\n${SQLInsertQueries}`;
          }

          if (insertOption === 'SQLInsertQueriesFromMockData') {
            sqlContent += `\n\n${SQLInsertQueriesFromMockData}`;
          }
        }

        return formatSQL(sqlContent);
      })();

      set({
        interfaces,
        SQLSchema,
        deleteTablesQueries: generateSQLDeleteTables(parsedSchema),
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
