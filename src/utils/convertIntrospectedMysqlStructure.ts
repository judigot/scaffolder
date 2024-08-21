import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { addRelationshipInfo } from '@/utils/identifySchema';

interface ITableDefinition {
  columns: IColumnInfo[];
}

export interface ITableMysql {
  TABLE_NAME: string;
  table_definition: ITableDefinition;
}

const convertType = (dataType: string): string => {
  switch (dataType) {
    case 'bigint':
      return 'number';
    case 'varchar':
    case 'char':
      return 'string';
    case 'timestamp':
      return 'Date';
    default:
      return 'unknown';
  }
};

const getRequiredColumns = (columns: IColumnInfo[]): string[] =>
  columns
    .filter((column) => column.is_nullable === 'NO')
    .map((column) => column.column_name);

const getForeignTables = (columns: IColumnInfo[]): string[] =>
  Array.from(
    new Set(
      columns
        .filter((column) => column.foreign_key !== null)
        .map((column) => column.foreign_key?.foreign_table_name ?? ''),
    ),
  ).filter((tableName) => tableName !== '');

const getForeignKeys = (columns: IColumnInfo[]): string[] =>
  columns
    .filter((column) => column.foreign_key !== null)
    .map((column) => column.column_name);

const convertColumn = (column: IColumnInfo): IColumnInfo => ({
  column_name: column.column_name,
  data_type: convertType(column.data_type),
  is_nullable: column.is_nullable,
  column_default: column.primary_key ? `AUTO_INCREMENT` : column.column_default,
  primary_key: column.primary_key,
  unique: column.unique,
  foreign_key: column.foreign_key,
});

const convertTable = (table: ITableMysql): ISchemaInfo => {
  const columnsInfo = table.table_definition.columns.map(convertColumn);
  const requiredColumns = getRequiredColumns(table.table_definition.columns);
  const foreignTables = getForeignTables(table.table_definition.columns);
  const foreignKeys = getForeignKeys(table.table_definition.columns);

  return {
    table: table.TABLE_NAME,
    requiredColumns,
    columnsInfo,
    foreignTables,
    foreignKeys,
    childTables: [],
    hasOne: [],
    hasMany: [],
    belongsTo: [],
    belongsToMany: [],
  };
};

const populateChildTables = (tableMap: Map<string, ISchemaInfo>): void => {
  tableMap.forEach((table) => {
    table.foreignTables.forEach((foreignTable) => {
      if (tableMap.has(foreignTable)) {
        tableMap.get(foreignTable)?.childTables.push(table.table);
      }
    });
  });
};

const convertIntrospectedStructure = (tables: ITableMysql[]): ISchemaInfo[] => {
  const tableMap = new Map(
    tables.map((table) => [table.TABLE_NAME, convertTable(table)]),
  );
  populateChildTables(tableMap);

  const schemaInfo = [...tableMap.values()];
  addRelationshipInfo(schemaInfo);

  return schemaInfo;
};

export default convertIntrospectedStructure;
