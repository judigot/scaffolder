import { create } from 'zustand';
import { format as formatSQL } from 'sql-formatter';
import generateMockData from '@/utils/generateMockData.ts';
import generateSQLInserts from '@/utils/generateSQLInserts.ts';
import generateSQLHasOneJoins from '@/utils/generateSQLHasOneJoins.ts';
import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins.ts';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables.ts';
import { useFormStore } from '@/useFormStore.ts';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces.ts';
import { ISchemaInfo, ParsedJSONSchema } from '@/interfaces/interfaces.ts';
import generateSQLSchema from '@/utils/generateSQLSchema.ts';
import generateSQLDirectJoins from '@/utils/generateSQLDirectJoins.ts';
import { oneToOne } from '@/schema-infos/index.ts';

interface IStore {
  schemaInfo: ISchemaInfo[];
  interfaces: Record<string, string>;
  getParsedSchemaInput: () => ParsedJSONSchema;
  SQLSchema: string;
  deleteTablesQueries: string[];
  mockData: ParsedJSONSchema;
  SQLInsertQueries: string;
  SQLInsertQueriesFromMockData: string;
  directJoins: string[];
  oneToOneJoins: string[];
  aggregateJoins: string[];
  setSchemaInfo: (schemaInfo: ISchemaInfo[]) => void;
  setIntrospectedSchema: (schemaInfo: ISchemaInfo[]) => void;
  setTransformations: (schemaInfo?: ISchemaInfo[] | null) => void;
}

const errorMessage = 'An error occurred';

export const useTransformationsStore = create<IStore>()((set, get) => ({
  schemaInfo: oneToOne,
  interfaces: {},
  getParsedSchemaInput: () => {
    const { schemaInput } = useFormStore.getState().formData;
    return schemaInput;
  },
  SQLSchema: '',
  deleteTablesQueries: [],
  mockData: {},
  SQLInsertQueries: '',
  SQLInsertQueriesFromMockData: '',
  directJoins: [],
  oneToOneJoins: [],
  aggregateJoins: [],
  setSchemaInfo: (schemaInfo) => {
    set({ schemaInfo });
    get().setTransformations(schemaInfo);
  },
  setIntrospectedSchema: (schemaInfo) => {
    if (schemaInfo.length === 0) {
      set({
        interfaces: {},
        SQLSchema: '',
        deleteTablesQueries: [],
        oneToOneJoins: [],
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
          schemaInput: parsedSchema,
        },
      }));
    } catch {
      set({
        interfaces: { errorMessage },
        SQLSchema: errorMessage,
        deleteTablesQueries: [errorMessage],
        oneToOneJoins: [errorMessage],
        mockData: {},
        SQLInsertQueries: errorMessage,
        SQLInsertQueriesFromMockData: errorMessage,
        aggregateJoins: [errorMessage],
      });
    }
  },
  setTransformations: (tempSchemaInfo?: ISchemaInfo[] | null) => {
    // If schemaInfo is not provided, get it from the current state
    const {
      formData: {
        includeInsertData,
        insertOption,
        includeTypeGuards,
        outputOnSingleFile,
      },
    } = useFormStore.getState();

    const schemaInfo = tempSchemaInfo ?? get().schemaInfo;

    if (schemaInfo.length === 0) {
      set({
        interfaces: {},
        SQLSchema: '',
        deleteTablesQueries: [],
        oneToOneJoins: [],
        mockData: {},
        SQLInsertQueries: '',
        SQLInsertQueriesFromMockData: '',
        aggregateJoins: [],
      });
      return;
    }

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
      SQLInsertQueries = generateSQLInserts(get().getParsedSchemaInput());
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

    let directJoins: string[] = [];
    try {
      directJoins = generateSQLDirectJoins(schemaInfo);
      set({ directJoins });
    } catch {
      set({ directJoins: [errorMessage] });
    }

    let oneToOneJoins: string[] = [];
    try {
      oneToOneJoins = generateSQLHasOneJoins(schemaInfo);
      set({ oneToOneJoins });
    } catch {
      set({ oneToOneJoins: [errorMessage] });
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
