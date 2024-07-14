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
