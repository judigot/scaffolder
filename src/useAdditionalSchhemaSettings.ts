import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';

// Helper function to calculate string similarity
const getSimilarity = (str1: string, str2: string): number => {
  const set1 = new Set(str1.toLowerCase());
  const set2 = new Set(str2.toLowerCase());
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  return intersection.size / Math.max(set1.size, set2.size);
};

interface IAdditionalSchemaStore {
  additionalSettings: {
    inputValues: Record<string, string>;
    addedValues: Record<string, string[]>;
    searchable: Record<string, boolean>;
    tableNameMapping: Record<string, string>; // Maps old table names to new ones
  };
  setInputValue: (schemaTable: string, value: string) => void;
  setAddedValues: (schemaTable: string, tags: string[]) => void;
  setSearchable: (schemaTable: string, value: boolean) => void;
  resetFormData: (schemaInfo: ISchemaInfo[]) => void;
}

/*
 * Configuration for persisting the store state in localStorage
 * We only persist the formData since it contains all the user input
 * The actions (setters) are recreated on each page load
 */
const persistConfig: PersistOptions<
  IAdditionalSchemaStore,
  Partial<IAdditionalSchemaStore>
> = {
  /* Unique identifier for this store in localStorage */
  name: 'additionalSchemaSettings',

  /* Use localStorage as our storage mechanism */
  storage: createJSONStorage(() => localStorage),

  /* Only persist the formData object, which contains all user input */
  partialize: (state) => ({
    additionalSettings: state.additionalSettings,
  }),
};

/*
 * Create the store with persistence middleware
 * This ensures the state survives page reloads
 */
export const useAdditionalSchemaStore = create<IAdditionalSchemaStore>()(
  persist(
    (set) => ({
      /* Initial state */
      additionalSettings: {
        inputValues: {},
        addedValues: {},
        searchable: {},
        tableNameMapping: {},
      },

      /* Actions to update state */
      setInputValue: (schemaTable, value) => {
        set((state) => ({
          additionalSettings: {
            ...state.additionalSettings,
            inputValues: {
              ...state.additionalSettings.inputValues,
              [schemaTable]: value,
            },
          },
        }));
      },

      setAddedValues: (schemaTable, tags) => {
        set((state) => ({
          additionalSettings: {
            ...state.additionalSettings,
            addedValues: {
              ...state.additionalSettings.addedValues,
              [schemaTable]: tags,
            },
            inputValues: {
              ...state.additionalSettings.inputValues,
              [schemaTable]: '',
            },
          },
        }));
      },

      setSearchable: (schemaTable, value) => {
        set((state) => ({
          additionalSettings: {
            ...state.additionalSettings,
            searchable: {
              ...state.additionalSettings.searchable,
              [schemaTable]: value,
            },
          },
        }));
      },

      resetFormData: (schemaInfo) => {
        set((state) => {
          // Helper function to find the most similar old table name
          const findMostSimilarTable = (newTable: string): string | undefined => {
            const oldTables = Object.keys(state.additionalSettings.inputValues);
            if (oldTables.length === 0) {return undefined;}

            const similarityThreshold = 0.5; // Adjust this value to be more or less strict
            let mostSimilar: string | undefined;
            let highestScore = 0;

            for (const oldTable of oldTables) {
              const score = getSimilarity(newTable, oldTable);
              if (score > highestScore && score >= similarityThreshold) {
                highestScore = score;
                mostSimilar = oldTable;
              }
            }

            return mostSimilar;
          };

          // Create new mapping and migrate data
          const newMapping: Record<string, string> = {};
          const newFormData: IAdditionalSchemaStore['additionalSettings'] = {
            inputValues: {},
            addedValues: {},
            searchable: {},
            tableNameMapping: newMapping,
          };

          // Build a map of old column names to new ones for each table
          const columnMappings: Record<string, Record<string, string>> = {};
          
          // First pass: collect all old table mappings
          schemaInfo.forEach((schema) => {
            const similarTable = findMostSimilarTable(schema.tableName);
            if (similarTable !== undefined && similarTable !== schema.tableName) {
              // Get all columns from the new schema
              const newColumns = schema.columnsInfo.map((col) => ({
                name: col.column_name,
                isPrimary: col.primary_key,
                isForeign: col.foreign_key !== null,
              }));

              // Map old column names to new ones based on similarity and type
              columnMappings[similarTable] = {};
              const oldAddedValues = state.additionalSettings.addedValues[similarTable] ?? [];
              
              oldAddedValues.forEach((oldColName) => {
                // Try to find a matching new column with the same characteristics
                const matchingNewCol = newColumns.find((col) => {
                  return getSimilarity(oldColName, col.name) > 0.5;
                });

                if (matchingNewCol) {
                  columnMappings[similarTable][oldColName] = matchingNewCol.name;
                }
              });
            }
          });

          // Second pass: migrate the data with the new mappings
          schemaInfo.forEach((schema) => {
            const similarTable = findMostSimilarTable(schema.tableName);

            if (similarTable !== undefined && similarTable !== schema.tableName) {
              // Migrate data from old table name to new one
              newFormData.inputValues[schema.tableName] = state.additionalSettings.inputValues[similarTable] ?? '';
              
              // Update column names in addedValues using the mapping
              const oldAddedValues = state.additionalSettings.addedValues[similarTable] ?? [];
              newFormData.addedValues[schema.tableName] = oldAddedValues.map((oldColName) => {
                const newColName = columnMappings[similarTable][oldColName];
                return newColName || oldColName.replace(similarTable, schema.tableName);
              });
              
              newFormData.searchable[schema.tableName] = state.additionalSettings.searchable[similarTable] ?? false;
              newMapping[similarTable] = schema.tableName;
            } else {
              // Initialize new tables with default values or keep existing ones
              newFormData.inputValues[schema.tableName] = state.additionalSettings.inputValues[schema.tableName] ?? '';
              newFormData.addedValues[schema.tableName] = state.additionalSettings.addedValues[schema.tableName] ?? [];
              newFormData.searchable[schema.tableName] = state.additionalSettings.searchable[schema.tableName] ?? false;
            }
          });

          return { additionalSettings: newFormData };
        });
      },
    }),
    persistConfig,
  ),
);
