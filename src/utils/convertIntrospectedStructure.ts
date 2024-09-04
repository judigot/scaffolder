import {
  DBTypes,
  IColumnInfo,
  ISchemaInfo,
  isITable,
  isITableMySQL,
  ITable,
  ITableMySQL,
} from '@/interfaces/interfaces';
import { addSchemaInfo } from '@/utils/identifySchema';
import { typeMappings } from '@/utils/mappings';
import pluralize from 'pluralize';

export const getTypeScriptType = (dataType: string): string => {
  // Normalize the data type to lowercase
  const identifiedType = dataType.toLowerCase();

  // Check if the identified type directly exists in typeMappings
  if (identifiedType in typeMappings) {
    return typeMappings[identifiedType].typescript;
  }

  // Iterate through the typeMappings to find a matching introspected type
  for (const mappings of Object.values(typeMappings)) {
    if (
      mappings['postgresql-introspected'].includes(identifiedType) ||
      mappings['mysql-introspected'].includes(identifiedType)
    ) {
      return mappings.typescript;
    }
  }

  // Fallback to string if no match is found
  return typeMappings.string.typescript;
};

export const getRequiredColumns = (columns: IColumnInfo[]): string[] =>
  columns
    .filter((column) => column.is_nullable === 'NO')
    .map((column) => column.column_name);

export const getForeignTables = (columns: IColumnInfo[]): string[] =>
  Array.from(
    new Set(
      columns
        .filter((column) => column.foreign_key !== null)
        .map((column) => column.foreign_key?.foreign_table_name ?? ''),
    ),
  ).filter((tableName) => tableName !== '');

export const getForeignKeys = (columns: IColumnInfo[]): string[] => {
  return Array.from(
    new Set(
      columns.filter((col) => col.foreign_key).map((col) => col.column_name),
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
}: IColumnInfo): IColumnInfo => ({
  column_name,
  data_type: getTypeScriptType(data_type),
  is_nullable,
  column_default: primary_key ? `AUTO_INCREMENT` : column_default,
  primary_key,
  unique,
  foreign_key,
});

export const convertTable = (
  table: ITable | ITableMySQL,
  dbType: DBTypes,
): ISchemaInfo => {
  let tableName: string;
  let columns: IColumnInfo[];

  if (dbType === 'mysql' && isITableMySQL(table)) {
    tableName = table.TABLE_NAME;
    columns = table.table_definition.columns;
  } else if (dbType === 'postgresql' && isITable(table)) {
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
    table: tableName,
    tablePlural: pluralize(tableName),
    requiredColumns,
    columnsInfo,
    foreignTables,
    foreignKeys,
    isPivot: false,
    childTables: [],
    hasOne: [],
    hasMany: [],
    belongsTo: [],
    belongsToMany: [],
    pivotRelationships: [],
  };
};

export const populateChildTables = (
  tableMap: Map<string, ISchemaInfo>,
): void => {
  tableMap.forEach((table) => {
    table.foreignTables.forEach((foreignTable) => {
      if (tableMap.has(foreignTable)) {
        tableMap.get(foreignTable)?.childTables.push(table.table);
      }
    });
  });
};

const convertIntrospectedStructure = (
  tables: ITable[] | ITableMySQL[],
  dbType: DBTypes,
): ISchemaInfo[] => {
  const tableMap = new Map(
    tables.map((table) => {
      if (dbType === 'mysql' && isITableMySQL(table)) {
        return [table.TABLE_NAME, convertTable(table, 'mysql')];
      } else if (dbType === 'postgresql' && isITable(table)) {
        return [table.table_name, convertTable(table, 'postgresql')];
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
