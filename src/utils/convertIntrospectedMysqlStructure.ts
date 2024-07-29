import { addHasOneOrMany } from '@/utils/identifySchema';

interface IForeignKey {
  foreign_table_name: string;
  foreign_column_name: string;
}

interface IColumnInfo {
  unique: boolean;
  data_type: string;
  column_name: string;
  foreign_key: IForeignKey | null;
  is_nullable: string;
  primary_key: boolean;
  column_default: string | null;
  check_constraints: unknown[];
}

interface ITableDefinition {
  columns: IColumnInfo[];
}

export interface ITableMysql {
  TABLE_NAME: string;
  table_definition: ITableDefinition;
}

interface IConvertedColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  primary_key: boolean;
  unique: boolean;
  foreign_key: IForeignKey | null;
}

interface IConvertedTable {
  table: string;
  requiredColumns: string[];
  columnsInfo: IConvertedColumnInfo[];
  foreignTables: string[];
  foreignKeys: string[];
  childTables: string[];
  hasOne: string[];
  hasMany: string[];
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

const convertColumn = (column: IColumnInfo): IConvertedColumnInfo => ({
  column_name: column.column_name,
  data_type: convertType(column.data_type),
  is_nullable: column.is_nullable,
  column_default: column.primary_key ? `AUTO_INCREMENT` : column.column_default,
  primary_key: column.primary_key,
  unique: column.unique,
  foreign_key: column.foreign_key,
});

const convertTable = (table: ITableMysql): IConvertedTable => {
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
  };
};

const populateChildTables = (tableMap: Map<string, IConvertedTable>): void => {
  tableMap.forEach((table) => {
    table.foreignTables.forEach((foreignTable) => {
      if (tableMap.has(foreignTable)) {
        tableMap.get(foreignTable)?.childTables.push(table.table);
      }
    });
  });
};

const convertIntrospectedStructure = (
  tables: ITableMysql[],
): IConvertedTable[] => {
  const tableMap = new Map<string, IConvertedTable>();

  tables.forEach((table) => {
    const convertedTable = convertTable(table);
    tableMap.set(table.TABLE_NAME, convertedTable);
  });

  populateChildTables(tableMap);
  addHasOneOrMany(Array.from(tableMap.values()));

  return Array.from(tableMap.values());
};

export default convertIntrospectedStructure;
