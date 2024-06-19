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
  mockData: Record<string, unknown[]>;
  deleteTablesQueries: string[];
  joins: string[];
  aggregateJoins: string[];
  includeInsertData: boolean;
  setIncludeInsertData: (includeInsertData: boolean) => void;
  setTransformations: () => void;
}

export const useTransformationsStore = create<IStore>()((set, get) => ({
  interfaces: '',
  SQLSchema: '',
  mockData: {},
  deleteTablesQueries: [],
  joins: [],
  aggregateJoins: [],
  includeInsertData: false,
  setIncludeInsertData: (includeInsertData) => {
    set({ includeInsertData });
  },
  setTransformations: () => {
    const schemaInput = useFormStore.getState().formData.schemaInput;
    if (schemaInput === '') {
      set({
        interfaces: '',
        SQLSchema: '',
        mockData: {},
        deleteTablesQueries: [],
        joins: [],
        aggregateJoins: [],
      });
      return;
    }

    try {
      const formData: Record<string, Record<string, unknown>[]> =
        JSON5.parse(schemaInput);
      set({
        interfaces: generateTypescriptInterfaces(formData),
        SQLSchema: formatSQL(
          generateSQLCreateTables(formData) +
            (get().includeInsertData
              ? '\n\n' + generateSQLInserts(formData)
              : ''),
        ),
        mockData: generateMockData(formData),
        deleteTablesQueries: generateSQLDeleteTables(formData),
        joins: generateSQLJoins(formData),
        aggregateJoins: generateSQLAggregateJoins(formData),
      });
    } catch (e) {
      set({
        interfaces: 'Invalid schema',
        SQLSchema: 'Invalid schema',
        deleteTablesQueries: ['Invalid schema'],
        mockData: {},
        joins: ['Invalid schema'],
        aggregateJoins: ['Invalid schema'],
      });
    }
  },
}));
