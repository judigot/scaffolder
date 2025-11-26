import { hiddenFields } from '../frameworks/backend/laravel/createModels';
export const getSchemaInfo = (schema) => {
  /* Create a map for quick table lookups */
  const tableMap = new Map();
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
  const getPrimaryKey = (tableName) => {
    const table = tableMap.get(tableName);
    if (!table) {
      return '';
    }
    const primaryKeys = table.columnsInfo
      .filter((col) => col.primary_key === true)
      .map((col) => col.column_name);
    return primaryKeys[0] ?? '';
  };
  /* Get foreign tables for a table */
  const getForeignTables = (tableName) => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.foreignTables ?? [];
  };
  /* Get required columns for a table */
  const getRequiredColumns = (tableName) => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    const requiredFromColumns = table.columnsInfo
      .filter((col) => col.is_nullable === 'NO')
      .map((col) => col.column_name);
    const explicitlyRequired = table.requiredColumns ?? [];
    return [...new Set([...requiredFromColumns, ...explicitlyRequired])];
  };
  /* Get all columns for a table */
  const getAllColumns = (tableName) => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.columnsInfo.map((col) => col.column_name);
  };
  /* Get hidden columns for a table */
  const getHiddenColumns = (tableName) => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    const allColumns = table.columnsInfo.map((col) => col.column_name);
    return allColumns.filter((column) => hiddenFields.includes(column));
  };
  /* Get columns info for a table */
  const getColumnsInfo = (tableName) => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.columnsInfo;
  };
  /* Get child tables for a table */
  const getChildTables = (tableName) => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.childTables ?? [];
  };
  /* Check if a table is a pivot table */
  const isPivot = (tableName) => {
    const table = tableMap.get(tableName);
    if (!table) {
      return false;
    }
    return table.isPivot === true;
  };
  /* Get all relationships for a table */
  const getRelationships = (tableName) => {
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
    getHiddenColumns,
    getColumnsInfo,
    getChildTables,
    getRelationships,
    isPivot,
  };
};
export default getSchemaInfo;
