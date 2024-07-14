import { IColumnInfo, IRelationshipInfo } from './identifyRelationships';
import { typeMappings } from './convertType';
import { toPascalCase } from '../helpers/toPascalCase';

const getColumnType = ({
  column_name,
  data_type,
  primary_key,
}: Pick<IColumnInfo, 'column_name' | 'data_type' | 'primary_key'>): string => {
  if (primary_key) return typeMappings.primaryKey.typescript;
  if (column_name.endsWith('_id')) return typeMappings.number.typescript;
  if (column_name.toLowerCase().includes('password'))
    return typeMappings.password.typescript;

  // Handle specific types that need conversion
  switch (data_type.toLowerCase()) {
    case 'bigint':
    case 'integer':
      return typeMappings.number.typescript;
    case 'text':
    case 'varchar':
      return typeMappings.string.typescript;
    case 'boolean':
      return typeMappings.boolean.typescript;
    case 'timestamptz(6)':
    case 'timestamp':
      return typeMappings.Date.typescript;
    default:
      return data_type.toLowerCase();
  }
};

const getColumnDefinition = ({
  column_name,
  data_type,
  is_nullable,
  primary_key,
}: IColumnInfo): string => {
  const type = getColumnType({ column_name, data_type, primary_key });
  const nullableString = !primary_key && is_nullable === 'YES' ? ' | null' : '';
  return `${column_name}: ${type}${nullableString};`;
};

const generateInterfaceString = (
  tableName: string,
  columnsInfo: IColumnInfo[],
): string => {
  const interfaceName = toPascalCase(tableName);
  const properties = columnsInfo.map(getColumnDefinition).join('\n  ');

  /* prettier-ignore */ (() => { const QuickLog = JSON.stringify(properties, null, 4); const parentDiv = document.getElementById('quicklogContainer') ?? (() => {const div = document.createElement('div');div.id = 'quicklogContainer';div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end;';document.body.appendChild(div);return div; })(); const createChildDiv = (text: typeof QuickLog) => {const newDiv = Object.assign(document.createElement('div'), { textContent: text, style: 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer;',});const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div');if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { const textArea = document.createElement('textarea'); textArea.value = clickedDiv.textContent ?? ''; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }};const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); }};newDiv.addEventListener('mousedown', handleMouseDown);newDiv.addEventListener('contextmenu', handleRightClick);return newDiv; };parentDiv.prepend(createChildDiv(QuickLog)); })()
  return `export interface I${interfaceName} {\n  ${properties}\n}`;
};

const generateTypescriptInterfaces = (
  relationships: IRelationshipInfo[],
): string => {
  return relationships
    .map(({ table, columnsInfo }) =>
      generateInterfaceString(table, columnsInfo),
    )
    .join('\n\n');
};

export default generateTypescriptInterfaces;
