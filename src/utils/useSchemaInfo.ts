import { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces.ts';

interface IRelationships {
  hasOne?: string[];
  hasMany?: string[];
  belongsTo?: string[];
  belongsToMany?: string[];
  pivotRelationships?: {
    relatedTable: string;
    pivotTable: string;
  }[];
}

interface ISchemaInfoResult {
  schema: ISchemaInfo[];
  tableNames: string[];
  pivotTables: string[];
  getPrimaryKey: (tableName: string) => string;
  getForeignTables: (tableName: string) => string[];
  getRequiredColumns: (tableName: string) => string[];
  getAllColumns: (tableName: string) => string[];
  getColumnsInfo: (tableName: string) => IColumnInfo[];
  getChildTables: (tableName: string) => string[];
  getRelationships: (tableName: string) => IRelationships;
  isPivot: (tableName: string) => boolean;
}

export const useSchemaInfo = (schema: ISchemaInfo[]): ISchemaInfoResult => {
  /* Create a map for quick table lookups */
  const tableMap = new Map<string, ISchemaInfo>();
  schema.forEach((table) => {
    tableMap.set(table.tableName, table);
  });

  /* Get all table names */
  const tableNames = schema.map((table) => table.tableName);

  /* Get pivot tables */
  const pivotTables = schema
    .filter((table) => table.isPivot === true)
    .map((table) => table.tableName);

  /* Get primary key column for a table */
  const getPrimaryKey = (tableName: string): string => {
    const table = tableMap.get(tableName);
    if (!table) {
      return '';
    }
    const primaryKeys = table.columnsInfo
      .filter((col: IColumnInfo) => col.primary_key === true)
      .map((col: IColumnInfo) => col.column_name);

    return primaryKeys[0] ?? '';
  };

  /* Get foreign tables for a table */
  const getForeignTables = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.foreignTables ?? [];
  };

  /* Get required columns for a table */
  const getRequiredColumns = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }

    const requiredFromColumns = table.columnsInfo
      .filter((col: IColumnInfo) => col.is_nullable === 'NO')
      .map((col: IColumnInfo) => col.column_name);

    const explicitlyRequired = table.requiredColumns ?? [];

    return [...new Set([...requiredFromColumns, ...explicitlyRequired])];
  };

  /* Get all columns for a table */
  const getAllColumns = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.columnsInfo.map((col: IColumnInfo) => col.column_name);
  };

  /* Get columns info for a table */
  const getColumnsInfo = (tableName: string): IColumnInfo[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.columnsInfo;
  };

  /* Get child tables for a table */
  const getChildTables = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.childTables ?? [];
  };

  /* Check if a table is a pivot table */
  const isPivot = (tableName: string): boolean => {
    const table = tableMap.get(tableName);
    if (!table) {
      return false;
    }
    return table.isPivot === true;
  };

  /* Get all relationships for a table */
  const getRelationships = (tableName: string): IRelationships => {
    const table = tableMap.get(tableName);
    if (!table) {
      return {};
    }

    return {
      hasOne: table.hasOne,
      hasMany: table.hasMany,
      belongsTo: table.belongsTo,
      belongsToMany: table.belongsToMany,
      pivotRelationships: table.pivotRelationships,
    };
  };

  return {
    schema,
    tableNames,
    pivotTables,
    getPrimaryKey,
    getForeignTables,
    getAllColumns,
    getRequiredColumns,
    getColumnsInfo,
    getChildTables,
    getRelationships,
    isPivot,
  };
};

export default useSchemaInfo;
