import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { typeMappings } from './convertType';

export const quoteTableName = (tableName: string): string => `"${tableName}"`;

export const getTypeMapping = (
  column: IColumnInfo,
  fileType: 'sql-tables' | 'ts-interfaces',
): string => {
  const targetType = fileType === 'sql-tables' ? 'postgresql' : 'typescript';
  const { column_name, data_type, primary_key } = column;

  if (primary_key) {
    return typeMappings.primaryKey[targetType];
  }

  if (column_name.toLowerCase().includes('password')) {
    return typeMappings.password[targetType];
  }

  if (column_name.endsWith('_id')) {
    return typeMappings.number[targetType];
  }

  return typeMappings[data_type][targetType];
};

export const getColumnDefinition = (
  column: IColumnInfo,
  fileType: 'sql-tables' | 'ts-interfaces',
): string => {
  const { column_name, is_nullable, primary_key, unique } = column;
  const type = getTypeMapping(column, fileType);
  let definition = '';

  switch (fileType) {
    case 'sql-tables':
      definition = `${column_name} ${type}`;
      if (unique) {
        definition += ' UNIQUE';
      }
      if (!primary_key && is_nullable === 'NO') {
        definition += ' NOT NULL';
      }
      definition = definition.trim();
      break;

    case 'ts-interfaces':
      definition = `${column_name}: ${type}`;
      if (!primary_key && is_nullable === 'YES') {
        definition += ' | null';
      }
      definition += ';';
      break;

    default:
      throw new Error('Invalid file type specified');
  }

  return definition;
};

export const getForeignKeyConstraints = (
  tableName: string,
  schemaInfo: ISchemaInfo[],
): string[] => {
  const tableRelationships = schemaInfo.find((rel) => rel.table === tableName);
  if (!tableRelationships) return [];

  return tableRelationships.foreignKeys.map((key) => {
    const referencedTable =
      tableRelationships.foreignTables.find((table) => key.startsWith(table)) ??
      key.slice(0, -3);
    return `CONSTRAINT FK_${tableName}_${key} FOREIGN KEY (${key}) REFERENCES ${quoteTableName(referencedTable)}(${key})`;
  });
};
