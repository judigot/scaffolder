import { typeMappings } from './convertType';

interface IColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  primary_key: boolean;
  unique: boolean;
  foreign_key: {
    foreign_table_name: string;
    foreign_column_name: string;
  } | null;
}

interface ITable {
  table_name: string;
  columns: IColumn[];
  check_constraints: string[];
}

interface IConvertedColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  primary_key: boolean;
  unique: boolean;
}

interface IConvertedTable {
  table: string;
  requiredColumns: string[];
  columnsInfo: IConvertedColumn[];
  foreignTables: string[];
  foreignKeys: string[];
  childTables: string[];
}

const getTypeScriptType = (dataType: string): string => {
  const identifiedType = dataType.toLowerCase();
  return typeMappings[identifiedType].typescript;
};

const getRequiredColumns = (columns: IColumn[]): string[] =>
  columns
    .filter((column) => column.is_nullable === 'NO')
    .map((column) => column.column_name);

const getForeignTables = (columns: IColumn[]): string[] =>
  Array.from(
    new Set(
      columns
        .filter((column) => column.foreign_key !== null)
        .map((column) => column.foreign_key?.foreign_table_name ?? ''),
    ),
  );

const getForeignKeys = (columns: IColumn[]): string[] =>
  columns
    .filter((column) => column.foreign_key !== null)
    .map((column) => column.column_name);

const convertColumn = (column: IColumn): IConvertedColumn => ({
  column_name: column.column_name,
  data_type: getTypeScriptType(column.data_type),
  is_nullable: column.is_nullable,
  column_default: column.column_default,
  primary_key: column.primary_key,
  unique: column.unique,
});

const convertTable = (table: ITable): IConvertedTable => {
  const columnsInfo = table.columns.map(convertColumn);
  const requiredColumns = getRequiredColumns(table.columns);
  const foreignTables = getForeignTables(table.columns);
  const foreignKeys = getForeignKeys(table.columns);

  return {
    table: table.table_name,
    requiredColumns,
    columnsInfo,
    foreignTables,
    foreignKeys,
    childTables: [],
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

const convertIntrospectedStructure = (tables: ITable[]): IConvertedTable[] => {
  const tableMap = new Map<string, IConvertedTable>();

  tables.forEach((table) => {
    const convertedTable = convertTable(table);
    tableMap.set(table.table_name, convertedTable);
  });

  populateChildTables(tableMap);

  return Array.from(tableMap.values());
};

export default convertIntrospectedStructure;
