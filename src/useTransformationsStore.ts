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

interface IStore {
  interfaces: string;
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
    const schemaInput = useFormStore.getState().formData.schemaInput;
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
      const mockData = generateMockData(formData); // Generate mock data once
      const relationships = identifyRelationships(formData); // Identify relationships once

      set({
        interfaces: generateFile(relationships, 'ts-interfaces'),
        SQLSchema: formatSQL(generateFile(relationships, 'sql-tables')),
        deleteTablesQueries: generateSQLDeleteTables(formData),
        joins: generateSQLJoins(relationships),
        mockData,
        SQLInsertQueries: formatSQL(generateSQLInserts(formData)),
        SQLInsertQueriesFromMockData: formatSQL(generateSQLInserts(mockData)), // Use the generated mock data
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
