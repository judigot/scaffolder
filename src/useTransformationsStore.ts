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
    const {
      schemaInput,
      // backendDir,
      // frontendDir,
      // dbConnection,
      // framework,
      includeInsertData,
      insertOption,
    } = useFormStore.getState().formData;

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
      const mockData = generateMockData(formData);
      const relationships = identifyRelationships(formData);

      /* prettier-ignore */ (() => { const QuickLog = JSON.stringify(relationships, null, 4); const parentDiv = document.getElementById('quicklogContainer') ?? (() => {const div = document.createElement('div');div.id = 'quicklogContainer';div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end;';document.body.appendChild(div);return div; })(); const createChildDiv = (text: typeof QuickLog) => {const newDiv = Object.assign(document.createElement('div'), { textContent: text, style: 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer;',});const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div');if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { const textArea = document.createElement('textarea'); textArea.value = clickedDiv.textContent ?? ''; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }};const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); }};newDiv.addEventListener('mousedown', handleMouseDown);newDiv.addEventListener('contextmenu', handleRightClick);return newDiv; };parentDiv.prepend(createChildDiv(QuickLog)); })()

      const interfaces = generateFile(relationships, 'ts-interfaces');

      const SQLSchema = (() => {
        let sqlContent = generateFile(relationships, 'sql-tables');

        if (includeInsertData) {
          if (insertOption === 'SQLInsertQueries') {
            sqlContent += `\n\n${generateSQLInserts(formData)}`;
          }

          if (insertOption === 'SQLInsertQueriesFromMockData') {
            sqlContent += `\n\n${generateSQLInserts(mockData)}`;
          }
        }

        return formatSQL(sqlContent);
      })();

      // fetch(`http://localhost:5000/scaffoldProject`, {
      //   method: 'POST',
      //   headers: {
      //     Accept: 'application/json',
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     relationships,
      //     interfaces,
      //     backendDir,
      //     frontendDir,
      //     dbConnection,
      //     framework,
      //     SQLSchema,
      //   }),
      // }).catch(() => {
      //   // Failure
      // });

      set({
        interfaces,
        SQLSchema,
        deleteTablesQueries: generateSQLDeleteTables(formData),
        joins: generateSQLJoins(relationships),
        mockData,
        SQLInsertQueries: formatSQL(generateSQLInserts(formData)),
        SQLInsertQueriesFromMockData: formatSQL(generateSQLInserts(mockData)),
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
