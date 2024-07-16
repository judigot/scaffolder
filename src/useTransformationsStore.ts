import { create } from 'zustand';
import { format as formatSQL } from 'sql-formatter';
import generateMockData from './utils/generateMockData';
import generateSQLInserts from './utils/generateSQLInserts';
import generateSQLJoins from '@/utils/generateSQLJoins';
import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables';
import { IRelationshipInfo } from '@/utils/identifyRelationships';
import { IFormData } from './useFormStore';
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
  setTransformations: (
    formData: Pick<IFormData, 'includeInsertData' | 'insertOption'> & {
      relationships: IRelationshipInfo[];
    },
  ) => void;
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
  setTransformations: ({ relationships, includeInsertData, insertOption }) => {
    if (relationships.length === 0) {
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
      const mockData = generateMockData(relationships);

      const interfaces = generateTypescriptInterfaces({
        relationships,
        includeTypeGuards: true,
        outputOnSingleFile: !true,
      });

      const SQLInsertQueries = generateSQLInserts(mockData);
      const SQLInsertQueriesFromMockData = generateSQLInserts(mockData);

      const SQLSchema = (() => {
        let sqlContent = generateFile(relationships, 'sql-tables');

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
        deleteTablesQueries: generateSQLDeleteTables(mockData),
        joins: generateSQLJoins(relationships),
        mockData,
        SQLInsertQueries: formatSQL(SQLInsertQueries),
        SQLInsertQueriesFromMockData: formatSQL(SQLInsertQueriesFromMockData),
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
