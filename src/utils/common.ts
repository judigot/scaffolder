import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { columnMappings, typeMappings } from '@/utils/mappings';
import dayjs from 'dayjs';

export const formatDateForMySQL = (date: Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

function determineSQLDatabaseType(
  dbConnection: string,
): 'postgresql' | 'mysql' | '' {
  if (dbConnection.startsWith('postgresql')) {
    return 'postgresql';
  }
  if (dbConnection.startsWith('mysql')) {
    return 'mysql';
  }

  return '';
}

export const quoteTableName = (tableName: string): string => {
  const quote = useFormStore.getState().quote;
  return `${quote}${tableName}${quote}`;
};

export const getTypeMapping = (
  column: IColumnInfo,
  fileType: 'sql-tables' | 'ts-interfaces',
): string => {
  const dbConnection = useFormStore.getState().formData.dbConnection;
  const targetType =
    fileType === 'sql-tables'
      ? determineSQLDatabaseType(dbConnection)
      : 'typescript';

  if (!targetType) {
    throw new Error('Unsupported database type');
  }

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
  const quote = useFormStore.getState().quote;
  const { column_name, is_nullable, primary_key, unique } = columnName;
  const type = getTypeMapping(columnName, columnType);
  const language = columnMappings[columnType];

  let definition = language.columnTemplate
    .replace(
      '$COLUMN_NAME',
      columnType === 'ts-interfaces'
        ? column_name
        : `${quote}${column_name}${quote}`,
    )
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
  const quote = useFormStore.getState().quote;
  const tableRelationships = schemaInfo.find((rel) => rel.table === tableName);
  if (!tableRelationships) return [];

  return tableRelationships.foreignKeys.map((key) => {
    const referencedTable =
      tableRelationships.foreignTables.find((table) => key.startsWith(table)) ??
      key.slice(0, -3);
    return `CONSTRAINT ${quote}FK_${tableName}_${key}${quote} FOREIGN KEY (${quote}${key}${quote}) REFERENCES ${quoteTableName(referencedTable)}(${quote}${key}${quote})`;
  });
};
