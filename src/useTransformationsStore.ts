import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
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
import { createTabSync } from '@/utils/createTabSync.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import { IStructure } from '@/components/FileViewer.tsx';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { useProjectStore } from '@/useProjectStore.ts';
import { sortTablesBasedOnHierarchy } from '@/utils/sortTablesBasedOnHierarchy.ts';

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
        const { project } = useFormStore.getState();
        const { invalidateProjectCache, selectedProject, projectBuildCache } =
          useProjectStore.getState();

        const sortedSchemaInfo = sortTablesBasedOnHierarchy(schemaInfo);

        // First update the schema info in our store
        set({ schemaInfo: sortedSchemaInfo });

        // Invalidate the built project cache

        // If we have a currently selected project, rebuild its files
        if (selectedProject) {
          invalidateProjectCache(selectedProject.name);
          const { userFiles } = useMockDatabaseStore.getState();
          useFormStore.setState(() => {
            // Check if we have a cached version of this project's file structure
            const cachedProjectFiles = projectBuildCache[selectedProject.name];

            let projectFiles: IStructure;

            if (cachedProjectFiles.length > 0) {
              // Use cached version if available

              projectFiles = cachedProjectFiles;
            } else {
              // Calculate new structure if not in cache

              projectFiles = buildProjectFiles(
                `/Projects/${selectedProject.name}`,
                userFiles,
                schemaInfo,
              );

              // Update cache with the new structure
              projectBuildCache[selectedProject.name] = projectFiles;
            }

            return {
              project,
              projectFiles,
              projectBuildCache: {
                [selectedProject.name]: projectFiles,
              },
            };
          });
        }

        // Run transformations on the schema
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
          useFormStore.setState({ schemaInput: parsedSchema });
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
