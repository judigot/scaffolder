import { typeMappings } from './convertType';
import { IColumnInfo, IRelationshipInfo } from './identifyRelationships';

interface ITable {
  table_name: string;
  columns: IColumnInfo[];
  check_constraints: string[];
}

const getTypeScriptType = (dataType: string): string => {
  const identifiedType = dataType.toLowerCase();
  return typeMappings[identifiedType].typescript;
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
  );

const getForeignKeys = (columns: IColumnInfo[]): string[] =>
  columns
    .filter((column) => column.foreign_key !== null)
    .map((column) => column.column_name);

const convertColumn = (column: IColumnInfo): IColumnInfo => ({
  column_name: column.column_name,
  data_type: getTypeScriptType(column.data_type),
  is_nullable: column.is_nullable,
  column_default: column.column_default,
  primary_key: column.primary_key,
  unique: column.unique,
  foreign_key: column.foreign_key,
});

const convertTable = (table: ITable): IRelationshipInfo => {
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

const populateChildTables = (
  tableMap: Map<string, IRelationshipInfo>,
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
  tables: ITable[],
): IRelationshipInfo[] => {
  const tableMap = new Map<string, IRelationshipInfo>();

  tables.forEach((table) => {
    const convertedTable = convertTable(table);
    tableMap.set(table.table_name, convertedTable);
  });

  populateChildTables(tableMap);

  return Array.from(tableMap.values());
};

export default convertIntrospectedStructure;
