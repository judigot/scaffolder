import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { typeMappings } from './convertType';
import { columnMappings } from '@/utils/mappings';

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

export const generateColumnDefinition = ({
  columnName,
  columnType,
}: {
  columnName: IColumnInfo;
  columnType: 'sql-tables' | 'ts-interfaces';
}): string => {
  const { column_name, is_nullable, primary_key, unique } = columnName;
  const type = getTypeMapping(columnName, columnType);
  const language = columnMappings[columnType];

  let definition = language.columnTemplate
    .replace('$COLUMN_NAME', column_name)
    .replace('$MAPPED_TYPE', type);

  const isUnique = unique && columnType === 'sql-tables';
  const isNotNullable =
    !primary_key && is_nullable === 'NO' && columnType === 'sql-tables';
  const isNullable =
    !primary_key && is_nullable === 'YES' && columnType === 'ts-interfaces';

  if (isUnique) {
    definition += ` ${language.unique}`;
  }

  if (isNotNullable) {
    definition += ` ${language.notNullable}`;
  }

  if (isNullable) {
    definition += language.nullable;
  }

  if (columnType === 'ts-interfaces') {
    definition += ';';
  }

  return definition.trim();
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
