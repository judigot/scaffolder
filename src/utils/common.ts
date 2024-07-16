import { IColumnInfo, IRelationshipInfo } from './identifyRelationships';
import { typeMappings } from './convertType';
import { toPascalCase } from '@/helpers/toPascalCase';

export const quoteTableName = (tableName: string): string => `"${tableName}"`;

export const getType = (
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
  const type = getType(column, fileType);
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
  relationships: IRelationshipInfo[],
): string[] => {
  const tableRelationships = relationships.find(
    (rel) => rel.table === tableName,
  );
  if (!tableRelationships) return [];

  return tableRelationships.foreignKeys.map((key) => {
    const referencedTable =
      tableRelationships.foreignTables.find((table) => key.startsWith(table)) ??
      key.slice(0, -3);
    return `CONSTRAINT FK_${tableName}_${key} FOREIGN KEY (${key}) REFERENCES ${quoteTableName(referencedTable)}(${key})`;
  });
};

export { toPascalCase };
