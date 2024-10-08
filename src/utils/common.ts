import { toPascalCase } from '@/helpers/toPascalCase';
import { DBTypes, IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo';
import { columnMappings, typeMappings } from '@/utils/mappings';
import dayjs from 'dayjs';

export function consolidateInterfaces(
  interfaces: Record<string, string>,
): string {
  return Object.entries(interfaces)
    .map(([fileName, content]) => `\n/* ${fileName}.ts */\n${content}`)
    .join('\n')
    .trimStart();
}

export const formatDateForMySQL = (date: Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const generateModelImports = (schemaInfo: ISchemaInfo): string => {
  const imports = new Set<string>();
  const { hasOne, hasMany, columnsInfo, pivotRelationships } = schemaInfo;

  // Collect unique import statements for related models
  [
    ...hasOne,
    ...hasMany,
    ...pivotRelationships.map((item) => item.relatedTable),
  ].forEach((relatedTable) => {
    const relatedClass = toPascalCase(relatedTable);
    imports.add(`use App\\Models\\${relatedClass};`);
  });

  columnsInfo.forEach((column) => {
    if (column.foreign_key) {
      const relatedClass = toPascalCase(column.foreign_key.foreign_table_name);
      imports.add(`use App\\Models\\${relatedClass};`);
    }
  });

  return Array.from(imports).join('\n');
};

export function determineSQLDatabaseType(dbConnection: string): DBTypes {
  const dbType = extractDBConnectionInfo(dbConnection).dbType;
  return dbType;
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
