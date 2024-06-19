import { create } from 'zustand';
import JSON5 from 'json5';
import { format as formatSQL } from 'sql-formatter';
import generateTypescriptInterfaces from './utils/generateInterfaceTypescript';
import generateSQLCreateTables from './utils/generateSQLSchema';
import generateMockData from './utils/generateMockData';
import generateSQLInserts from './utils/generateSQLInserts';
import generateSQLJoins from '@/utils/generateSQLJoins';
import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins';

interface IStore {
  interfaces: string;
  SQLSchema: string;
  mockData: Record<string, unknown[]>;
  joins: string[];
  aggregateJoins: string[];
  includeInsertData: boolean;
  setIncludeInsertData: (includeInsertData: boolean) => void;
  setTransformations: (schemaString: string) => void;
}

export const useTransformationsStore = create<IStore>()((set, get) => ({
  interfaces: '',
  SQLSchema: '',
  mockData: {},
  joins: [],
  aggregateJoins: [],
  includeInsertData: false,
  setIncludeInsertData: (includeInsertData) => {
    set({ includeInsertData });
  },
  setTransformations: (schemaString: string) => {
    if (schemaString === '') {
      set({
        interfaces: '',
        SQLSchema: '',
        mockData: {},
        joins: [],
        aggregateJoins: [],
      });
      return;
    }

    try {
      const parsedSchema: Record<string, Record<string, unknown>[]> =
        JSON5.parse(schemaString);
      set({
        interfaces: generateTypescriptInterfaces(parsedSchema),
        SQLSchema: formatSQL(
          generateSQLCreateTables(parsedSchema) +
            (get().includeInsertData
              ? '\n\n' + generateSQLInserts(parsedSchema)
              : ''),
        ),
        mockData: generateMockData(parsedSchema),
        joins: generateSQLJoins(parsedSchema),
        aggregateJoins: generateSQLAggregateJoins(parsedSchema),
      });
    } catch (e) {
      set({
        interfaces: 'Invalid JSON input',
        SQLSchema: 'Invalid JSON input',
        mockData: {},
        joins: ['Invalid JSON input'],
      });
    }
  },
}));
