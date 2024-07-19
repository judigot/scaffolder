import { create } from 'zustand';
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
import JSON5 from 'json5';

interface IStore {
  interfaces: string | Record<string, string>;
  getParsedSchemaInput: () => Record<string, Record<string, unknown>[]>;
  SQLSchema: string;
  deleteTablesQueries: string[];
  joins: string[];
  mockData: Record<string, unknown[]>;
  SQLInsertQueries: string;
  SQLInsertQueriesFromMockData: string;
  aggregateJoins: string[];
  getSchemaInfo: () => IRelationshipInfo[];
  setIntrospectedSchema: (schemaInfo: IRelationshipInfo[]) => void;
  setTransformations: () => void;
}

export const useTransformationsStore = create<IStore>((set, get) => ({
  interfaces: '',
  getParsedSchemaInput: () => {
    const { schemaInput } = useFormStore.getState().formData;
    const parsedSchema: Record<string, Record<string, unknown>[]> =
      JSON5.parse(schemaInput);
    return parsedSchema;
  },
  SQLSchema: '',
  deleteTablesQueries: [],
  joins: [],
  mockData: {},
  SQLInsertQueries: '',
  SQLInsertQueriesFromMockData: '',
  aggregateJoins: [],
  getSchemaInfo: () => {
    return identifyRelationships(get().getParsedSchemaInput());
  },
  setIntrospectedSchema: (schemaInfo) => {
    if (schemaInfo.length === 0) {
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

    const { includeInsertData, insertOption } =
      useFormStore.getState().formData;

    try {
      const parsedSchema = generateMockData(schemaInfo);
      const mockData = generateMockData(schemaInfo);

      const interfaces = generateTypescriptInterfaces({
        relationships: schemaInfo,
        includeTypeGuards: true,
        outputOnSingleFile: false,
      });

      const SQLInsertQueries = generateSQLInserts(parsedSchema);
      const SQLInsertQueriesFromMockData = generateSQLInserts(mockData);

      const SQLSchema = (() => {
        let sqlContent = generateFile(schemaInfo, 'sql-tables');

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

      /* prettier-ignore */ (() => { const QuickLog = SQLSchema; const parentDiv = document.getElementById('quicklogContainer') ?? (() => {const div = document.createElement('div');div.id = 'quicklogContainer';div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end;';document.body.appendChild(div);return div; })(); const createChildDiv = (text: typeof QuickLog) => {const newDiv = Object.assign(document.createElement('div'), { textContent: text, style: 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer;',});const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div');if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { const textArea = document.createElement('textarea'); textArea.value = clickedDiv.textContent ?? ''; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }};const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); }};newDiv.addEventListener('mousedown', handleMouseDown);newDiv.addEventListener('contextmenu', handleRightClick);return newDiv; };parentDiv.prepend(createChildDiv(QuickLog)); })()

      set({
        interfaces,
        SQLSchema,
        deleteTablesQueries: generateSQLDeleteTables(parsedSchema),
        joins: generateSQLJoins(schemaInfo),
        mockData,
        SQLInsertQueries: formatSQL(SQLInsertQueries),
        SQLInsertQueriesFromMockData: formatSQL(SQLInsertQueriesFromMockData),
        aggregateJoins: generateSQLAggregateJoins(schemaInfo),
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
  setTransformations: () => {
    const schemaInfo = get().getSchemaInfo();
    if (schemaInfo.length === 0) {
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

    const { includeInsertData, insertOption } =
      useFormStore.getState().formData;

    try {
      const parsedSchema = get().getParsedSchemaInput();
      const mockData = generateMockData(schemaInfo);

      const interfaces = generateTypescriptInterfaces({
        relationships: schemaInfo,
        includeTypeGuards: true,
        outputOnSingleFile: false,
      });

      const SQLInsertQueries = generateSQLInserts(parsedSchema);
      const SQLInsertQueriesFromMockData = generateSQLInserts(mockData);

      const SQLSchema = (() => {
        let sqlContent = generateFile(schemaInfo, 'sql-tables');

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
        deleteTablesQueries: generateSQLDeleteTables(parsedSchema),
        joins: generateSQLJoins(schemaInfo),
        mockData,
        SQLInsertQueries: formatSQL(SQLInsertQueries),
        SQLInsertQueriesFromMockData: formatSQL(SQLInsertQueriesFromMockData),
        aggregateJoins: generateSQLAggregateJoins(schemaInfo),
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

export default useTransformationsStore;
