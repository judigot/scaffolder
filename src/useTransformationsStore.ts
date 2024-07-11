import { create } from 'zustand';
import JSON5 from 'json5';
import { format as formatSQL } from 'sql-formatter';
import generateTypescriptInterfaces from './utils/generateInterfaceTypescript';
import generateSQLCreateTables from './utils/generateSQLSchema';
import generateMockData from './utils/generateMockData';
import generateSQLInserts from './utils/generateSQLInserts';
import generateSQLJoins from '@/utils/generateSQLJoins';
import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables';
import { useFormStore } from './useFormStore';

interface IStore {
  interfaces: string;
  SQLSchema: string;
  deleteTablesQueries: string[];
  joins: string[];
  mockData: Record<string, unknown[]>;
  SQLInsertQueries: string;
  SQLInsertQueriesFromMockData: string;
  aggregateJoins: string[];
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
      });
      return;
    }

    try {
      const formData: Record<string, Record<string, unknown>[]> =
        JSON5.parse(schemaInput);
      const mockData = generateMockData(formData); // Generate mock data once

      set({
        interfaces: generateTypescriptInterfaces(formData),
        SQLSchema: formatSQL(generateSQLCreateTables(formData)),
        deleteTablesQueries: generateSQLDeleteTables(formData),
        joins: generateSQLJoins(formData),
        mockData: mockData, // Set the generated mock data
        SQLInsertQueries: formatSQL(generateSQLInserts(formData)),
        SQLInsertQueriesFromMockData: formatSQL(generateSQLInserts(mockData)), // Use the generated mock data
        aggregateJoins: generateSQLAggregateJoins(formData),
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
