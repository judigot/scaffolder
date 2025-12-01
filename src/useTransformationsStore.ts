import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type PersistOptions,
} from 'zustand/middleware';
import { format as formatSQL } from 'sql-formatter';
import generateMockData from '@/utils/generateMockData.ts';
import generateSQLInserts from '@/utils/generateSQLInserts.ts';
import generateSQLHasOneJoins from '@/utils/generateSQLHasOneJoins.ts';
import generateSQLAggregateJoins from '@/utils/generateSQLAggregateJoins.ts';
import generateSQLDeleteTables from '@/utils/generateSQLDeleteTables.ts';
import { useFormStore } from '@/useFormStore.ts';
import generateTypescriptInterfaces from '@/utils/generateTypescriptInterfaces.ts';
import type { ISchemaInfo, ParsedJSONSchema } from '@/interfaces/interfaces.ts';
import generateSQLSchema from '@/utils/generateSQLSchema.ts';
import generateSQLDirectJoins from '@/utils/generateSQLDirectJoins.ts';
import { createTabSync } from '@/utils/createTabSync.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { useProjectStore } from '@/useProjectStore.ts';
import { sortTablesBasedOnHierarchy } from '@/utils/sortTablesBasedOnHierarchy.ts';
import { MAX_MOCK_DATA_ROWS } from '@/constants.ts';

interface ITransformations extends Record<PropertyKey, unknown> {
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

const persistConfig: PersistOptions<ITransformations, unknown> = {
  name: 'transformationsData',
  storage: createJSONStorage(() => localStorage),
  version: 1,
  partialize: (state) => ({
    schemaInfo: state.schemaInfo,
  }),
};

export const useTransformationsStore = create<ITransformations>()(
  persist((rawSet, get) => {
    const set = createTabSync<ITransformations>('schemaInfo-sync')(rawSet);
    return {
      schemaInfo: masterSchema,
      interfaces: {},
      getParsedSchemaInput: () => {
        const { schemaInput } = useFormStore.getState();
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
        const { invalidateProjectCache, selectedProject } =
          useProjectStore.getState();

        const sortedSchemaInfo = sortTablesBasedOnHierarchy(schemaInfo);

        // First update the schema info in our store
        set({ schemaInfo: sortedSchemaInfo });

        // Invalidate the built project cache

        // If we have a currently selected project, rebuild its files
        if (selectedProject) {
          invalidateProjectCache(selectedProject.name);
          const { userFiles } = useMockDatabaseStore.getState();
          const formData = useFormStore.getState();
          void (async () => {
            const buildResult = await buildProjectFiles(
              `/Projects/${selectedProject.name}`,
              userFiles,
              schemaInfo,
              formData,
            );
            const projectFiles = buildResult.structure;

            // Update project build cache in useProjectStore
            useProjectStore.setState((state) => ({
              projectBuildCache: {
                ...state.projectBuildCache,
                [selectedProject.name]: {
                  structure: projectFiles,
                  filesUsingUserEnv: buildResult.filesUsingUserEnv,
                  filesFailedToFormat: buildResult.filesFailedToFormat,
                },
              },
            }));
          })();
        }

        // Run transformations on the schema
        get().setTransformations(sortedSchemaInfo);
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

          // Create a new variable that combines mock data with seed data using map
          const seedData: ParsedJSONSchema = Object.fromEntries(
            schemaInfo
              .filter(
                (
                  table,
                ): table is ISchemaInfo & { data: Record<string, unknown>[] } =>
                  Boolean(
                    table.data &&
                    Array.isArray(table.data) &&
                    table.data.length > 0,
                  ),
              )
              .map((table) => [table.tableName, table.data]),
          );

          // Fix foreign key references in mock data to only use seed data IDs
          const fixedParsedSchema = Object.fromEntries(
            Object.entries(parsedSchema).map(([tableName, records]) => {
              if (tableName in seedData) {
                // If table has seed data, use only seed data
                return [tableName, seedData[tableName]];
              }

              // For tables without seed data, fix foreign key references
              const table = schemaInfo.find((t) => t.tableName === tableName);
              if (!table) {
                return [tableName, records];
              }

              const fixedRecords = records.map((record) => {
                const fixedRecord = { ...record };

                // Fix foreign key values to only reference seed data
                table.columnsInfo.forEach((col) => {
                  if (col.foreign_key) {
                    const foreignTableName = col.foreign_key.foreign_table_name;
                    const foreignColumnName =
                      col.foreign_key.foreign_column_name;
                    const foreignSeedData = seedData[foreignTableName];

                    if (
                      Array.isArray(foreignSeedData) &&
                      foreignSeedData.length > 0
                    ) {
                      // Only use seed data values for foreign keys
                      const randomSeedRecord =
                        foreignSeedData[
                          Math.floor(Math.random() * foreignSeedData.length)
                        ];
                      fixedRecord[col.column_name] =
                        randomSeedRecord[foreignColumnName];
                    }
                  }
                });

                return fixedRecord;
              });

              return [tableName, fixedRecords];
            }),
          );

          const finalParsedSchema: ParsedJSONSchema = fixedParsedSchema;

          useFormStore.setState({ schemaInput: finalParsedSchema });
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
        const { typeMappings } = useMockDatabaseStore.getState();

        if (!typeMappings || Object.keys(typeMappings).length === 0) {
          return;
        }

        const { includeInsertData, insertOption, includeTypeGuards } =
          useFormStore.getState();

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
        let finalMockData: ParsedJSONSchema = {};
        try {
          mockData = generateMockData({
            mockDataRows: MAX_MOCK_DATA_ROWS,
            schemaInfo,
          });

          // Create a new variable that combines mock data with seed data using map
          const seedData: ParsedJSONSchema = Object.fromEntries(
            schemaInfo
              .filter(
                (
                  table,
                ): table is ISchemaInfo & { data: Record<string, unknown>[] } =>
                  Boolean(
                    table.data &&
                    Array.isArray(table.data) &&
                    table.data.length > 0,
                  ),
              )
              .map((table) => [table.tableName, table.data]),
          );

          // Fix foreign key references in mock data to only use seed data IDs
          const fixedMockData = Object.fromEntries(
            Object.entries(mockData).map(([tableName, records]) => {
              if (tableName in seedData) {
                // If table has seed data, use only seed data
                return [tableName, seedData[tableName]];
              }

              // For tables without seed data, fix foreign key references
              const table = schemaInfo.find((t) => t.tableName === tableName);
              if (!table) {
                return [tableName, records];
              }

              const fixedRecords = records.map((record) => {
                const fixedRecord = { ...record };

                // Fix foreign key values to only reference seed data
                table.columnsInfo.forEach((col) => {
                  if (col.foreign_key) {
                    const foreignTableName = col.foreign_key.foreign_table_name;
                    const foreignColumnName =
                      col.foreign_key.foreign_column_name;
                    const foreignSeedData = seedData[foreignTableName];

                    if (
                      Array.isArray(foreignSeedData) &&
                      foreignSeedData.length > 0
                    ) {
                      // Only use seed data values for foreign keys
                      const randomSeedRecord =
                        foreignSeedData[
                          Math.floor(Math.random() * foreignSeedData.length)
                        ];
                      fixedRecord[col.column_name] =
                        randomSeedRecord[foreignColumnName];
                    }
                  }
                });

                return fixedRecord;
              });

              return [tableName, fixedRecords];
            }),
          );

          finalMockData = fixedMockData;

          set({ mockData: finalMockData });
        } catch {
          finalMockData = {};
          set({ mockData: {} });
        }

        let interfaces: string | Record<string, string> = '';
        try {
          interfaces = generateTypescriptInterfaces({
            schemaInfo,
            includeTypeGuards,
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
          SQLInsertQueriesFromMockData = generateSQLInserts(finalMockData);
          set({
            SQLInsertQueriesFromMockData: formatSQL(
              SQLInsertQueriesFromMockData,
            ),
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
          directJoins = generateSQLDirectJoins(schemaInfo).filter(
            (join): join is string => join !== undefined,
          );
          set({ directJoins });
        } catch {
          set({ directJoins: [errorMessage] });
        }

        let oneToOneJoins: string[] = [];
        try {
          oneToOneJoins = generateSQLHasOneJoins(schemaInfo).filter(
            (join): join is string => join !== undefined,
          );
          set({ oneToOneJoins });
        } catch {
          set({ oneToOneJoins: [errorMessage] });
        }

        let aggregateJoins: string[] = [];
        try {
          aggregateJoins = generateSQLAggregateJoins(schemaInfo).filter(
            (join): join is string => join !== undefined,
          );
          set({ aggregateJoins });
        } catch {
          set({ aggregateJoins: [errorMessage] });
        }
      },
    };
  }, persistConfig),
);

export default useTransformationsStore;
