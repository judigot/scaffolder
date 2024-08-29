import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { addRelationshipInfo } from './identifySchema';
import { typeMappings } from '@/utils/mappings';
import pluralize from 'pluralize';

export interface ITable {
  table_name: string;
  columns: IColumnInfo[];
  check_constraints: string[];
}

const getTypeScriptType = (dataType: string): string => {
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

const convertTable = (table: ITable): ISchemaInfo => {
  const columnsInfo = table.columns.map(convertColumn);
  const requiredColumns = getRequiredColumns(table.columns);
  const foreignTables = getForeignTables(table.columns);
  const foreignKeys = getForeignKeys(table.columns);

  return {
    table: table.table_name,
    tablePlural: pluralize(table.table_name),
    requiredColumns,
    columnsInfo,
    foreignTables,
    foreignKeys,
    childTables: [],
    isPivot: false,
    hasOne: [],
    hasMany: [],
    belongsTo: [],
    belongsToMany: [],
    pivotRelationships: [],
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

const convertIntrospectedStructure = (tables: ITable[]): ISchemaInfo[] => {
  const tableMap = new Map(
    tables.map((table) => [table.table_name, convertTable(table)]),
  );
  populateChildTables(tableMap);

  const schemaInfo = [...tableMap.values()];
  addRelationshipInfo(schemaInfo);

  return schemaInfo;
};

export default convertIntrospectedStructure;
