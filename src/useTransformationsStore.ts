import { create } from 'zustand';
import JSON5 from 'json5';
import { format as formatSQL } from 'sql-formatter';
import generateMockData from './utils/generateMockData';
import generateSQLInserts from './utils/generateSQLInserts';
import generateSQLJoins from '@/utils/generateSQLJoins';
import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables';
import identifyRelationships, {
  IRelationshipInfo,
} from '@/utils/identifyRelationships';
import { useFormStore } from './useFormStore';
import generateFile from '@/utils/generateFile';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces';

interface IStore {
  interfaces: string | Record<string, string>;
  SQLSchema: string;
  deleteTablesQueries: string[];
  joins: string[];
  mockData: Record<string, unknown[]>;
  SQLInsertQueries: string;
  SQLInsertQueriesFromMockData: string;
  aggregateJoins: string[];
  relationships: IRelationshipInfo[];
  setTransformations: () => void;
}

export const useTransformationsStore = create<IStore>((set) => ({
  interfaces: '',
  SQLSchema: '',
  deleteTablesQueries: [],
  joins: [],
  mockData: {},
  SQLInsertQueries: '',
  SQLInsertQueriesFromMockData: '',
  aggregateJoins: [],
  relationships: [],
  setTransformations: () => {
    const {
      schemaInput,
      includeInsertData,
      insertOption,
    } = useFormStore.getState().formData;

    if (schemaInput === '') {
      set({
        interfaces: '',
        SQLSchema: '',
        deleteTablesQueries: [],
        joins: [],
        mockData: {},
        SQLInsertQueries: '',
        SQLInsertQueriesFromMockData: '',
        aggregateJoins: [],
        relationships: [],
      });
      return;
    }

    try {
      const formData: Record<string, Record<string, unknown>[]> =
        JSON5.parse(schemaInput);
      const mockData = generateMockData(formData);
      const relationships = identifyRelationships(formData);

      const interfaces = generateTypescriptInterfaces({
        relationships,
        includeTypeGuards: true,
        outputOnSingleFile: !true,
      });

      const SQLSchema = (() => {
        let sqlContent = generateFile(relationships, 'sql-tables');

        if (includeInsertData) {
          if (insertOption === 'SQLInsertQueries') {
            sqlContent += `\n\n${generateSQLInserts(formData)}`;
          }

          if (insertOption === 'SQLInsertQueriesFromMockData') {
            sqlContent += `\n\n${generateSQLInserts(mockData)}`;
          }
        }

        return formatSQL(sqlContent);
      })();

      set({
        interfaces,
        SQLSchema,
        deleteTablesQueries: generateSQLDeleteTables(formData),
        joins: generateSQLJoins(relationships),
        mockData,
        SQLInsertQueries: formatSQL(generateSQLInserts(formData)),
        SQLInsertQueriesFromMockData: formatSQL(generateSQLInserts(mockData)),
        aggregateJoins: generateSQLAggregateJoins(relationships),
        relationships,
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
        relationships: [],
      });
    }
  },
}));

export default useTransformationsStore;
