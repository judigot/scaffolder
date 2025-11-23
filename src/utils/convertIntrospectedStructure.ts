import {
  type IColumnInfo,
  type ISchemaInfo,
  isITable,
  type IIntrospectedSchemaInfo,
} from '@/interfaces/interfaces.ts';
import { addSchemaInfo } from '@/utils/identifySchema.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const getTypeScriptType = (dataType: string): string => {
  const typeMappings = useMockDatabaseStore.getState().typeMappings;
  if (!typeMappings || !isRecord(typeMappings)) {
    return 'string';
  }

  const identifiedType = dataType.toLowerCase();

  if (identifiedType in typeMappings) {
    const mapping = typeMappings[identifiedType];
    if (isRecord(mapping) && 'typescript' in mapping) {
      const tsType = mapping.typescript;
      if (typeof tsType === 'string') {
        return tsType;
      }
    }
  }

  for (const mapping of Object.values(typeMappings)) {
    if (!isRecord(mapping)) {
      continue;
    }

    const postgresqlIntrospected = mapping['postgresql-introspected'];
    const mysqlIntrospected = mapping['mysql-introspected'];

    if (
      (Array.isArray(postgresqlIntrospected) &&
        postgresqlIntrospected.includes(identifiedType)) ||
      (Array.isArray(mysqlIntrospected) &&
        mysqlIntrospected.includes(identifiedType))
    ) {
      const tsType = mapping.typescript;
      if (typeof tsType === 'string') {
        return tsType;
      }
    }
  }

  const stringMapping = typeMappings.string;
  if (isRecord(stringMapping) && 'typescript' in stringMapping) {
    const tsType = stringMapping.typescript;
    if (typeof tsType === 'string') {
      return tsType;
    }
  }

  return 'string';
};

export const getRequiredColumns = (columns: IColumnInfo[]): string[] =>
  columns
    .filter((column) => column.is_nullable === 'NO')
    .map((column) => column.column_name);

export const getForeignTables = (columns: IColumnInfo[]): string[] =>
  Array.from(
    new Set(
      columns
        .filter((column) => column.foreign_key !== undefined)
        .map((column) => column.foreign_key?.foreign_table_name ?? ''),
    ),
  ).filter((tableName) => tableName !== '');

export const getForeignKeys = (columns: IColumnInfo[]): string[] => {
  return Array.from(
    new Set(
      columns
        .filter((col) => Boolean(col.foreign_key))
        .map((col) => col.column_name),
    ),
  );
};

export const convertColumn = ({
  column_name,
  data_type,
  is_nullable,
  column_default,
  primary_key,
  unique,
  foreign_key,
}: IColumnInfo): IColumnInfo => {
  const convertedColumn: IColumnInfo = {
    column_name,
    data_type: getTypeScriptType(data_type),
    is_nullable,
    ...(() => {
      if (primary_key) {
        return { column_default: 'AUTO_INCREMENT' };
      }
      if (column_default !== undefined && column_default !== null) {
        return {
          column_default: column_default.replace(/'([^']+)'::text/, '$1'),
        };
      }
      return {};
    })(),
    ...(primary_key && { primary_key }),
    ...(unique && { unique }),
    ...(foreign_key && { foreign_key }),
  };
  return convertedColumn;
};

export const convertTable = (table: IIntrospectedSchemaInfo): ISchemaInfo => {
  let tableName: string;
  let columns: IColumnInfo[];

  if (isITable(table)) {
    tableName = table.table_name;
    columns = table.columns;
  } else {
    throw new Error('Invalid table structure or dbType');
  }

  const columnsInfo = columns.map(convertColumn);
  const requiredColumns = getRequiredColumns(columnsInfo);
  const foreignTables = getForeignTables(columnsInfo);
  const foreignKeys = getForeignKeys(columnsInfo);

  return {
    tableName,
    ...(requiredColumns.length > 0 && { requiredColumns }),
    columnsInfo,
    ...(foreignTables.length > 0 && { foreignTables }),
    ...(foreignKeys.length > 0 && { foreignKeys }),
  };
};

export const populateChildTables = (
  tableMap: Map<string, ISchemaInfo>,
): void => {
  tableMap.forEach((table) => {
    table.foreignTables?.forEach((foreignTable) => {
      if (tableMap.has(foreignTable)) {
        tableMap.get(foreignTable)?.childTables?.push(table.tableName);
      }
    });
  });
};

const convertIntrospectedStructure = (
  tables: IIntrospectedSchemaInfo[],
): ISchemaInfo[] => {
  const tableMap = new Map(
    tables.map((table) => {
      if (isITable(table)) {
        return [table.table_name, convertTable(table)];
      } else {
        throw new Error('Invalid table structure or dbType');
      }
    }),
  );

  let schemaInfo = [...tableMap.values()];

  schemaInfo = addSchemaInfo(schemaInfo);

  return schemaInfo;
};

export default convertIntrospectedStructure;
