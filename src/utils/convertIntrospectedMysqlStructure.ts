import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import {
  getForeignKeys,
  getForeignTables,
  getRequiredColumns,
  populateChildTables,
} from '@/utils/convertIntrospectedStructure';
import { addRelationshipInfo } from '@/utils/identifySchema';
import pluralize from 'pluralize';

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
    tablePlural: pluralize(table.TABLE_NAME),
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

const convertIntrospectedMysqlStructure = (tables: ITableMysql[]): ISchemaInfo[] => {
  const tableMap = new Map(
    tables.map((table) => [table.TABLE_NAME, convertTable(table)]),
  );
  populateChildTables(tableMap);

  const schemaInfo = [...tableMap.values()];
  addRelationshipInfo(schemaInfo);

  return schemaInfo;
};

export default convertIntrospectedMysqlStructure;
