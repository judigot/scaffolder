import type { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces.ts';

/**
 * Normalizes a schema for deterministic comparison.
 * Handles:
 * - Sorting all arrays
 * - Normalizing AUTO_INCREMENT defaults
 * - Handling undefined vs missing properties
 * - Ensuring consistent field ordering
 */
export const normalizeSchema = (schema: ISchemaInfo[]): ISchemaInfo[] => {
  return schema
    .map(normalizeTable)
    .sort((a, b) => a.tableName.localeCompare(b.tableName));
};

const normalizeTable = (table: ISchemaInfo): ISchemaInfo => {
  const normalized: ISchemaInfo = {
    tableName: table.tableName,
    columnsInfo: normalizeColumns(table.columnsInfo),
  };

  /* Add optional fields only if they exist and have content */
  if (table.requiredColumns && table.requiredColumns.length > 0) {
    normalized.requiredColumns = [...table.requiredColumns].sort();
  }

  if (table.foreignKeys && table.foreignKeys.length > 0) {
    normalized.foreignKeys = [...table.foreignKeys].sort();
  }

  if (table.foreignTables && table.foreignTables.length > 0) {
    normalized.foreignTables = [...table.foreignTables].sort();
  }

  if (table.childTables && table.childTables.length > 0) {
    normalized.childTables = [...table.childTables].sort();
  }

  if (table.hasOne && table.hasOne.length > 0) {
    normalized.hasOne = [...table.hasOne].sort();
  }

  if (table.hasMany && table.hasMany.length > 0) {
    normalized.hasMany = [...table.hasMany].sort();
  }

  if (table.belongsTo && table.belongsTo.length > 0) {
    normalized.belongsTo = [...table.belongsTo].sort();
  }

  if (table.belongsToMany && table.belongsToMany.length > 0) {
    normalized.belongsToMany = [...table.belongsToMany].sort();
  }

  if (table.isPivot) {
    normalized.isPivot = table.isPivot;
  }

  if (table.viewQuery !== undefined) {
    normalized.viewQuery = table.viewQuery;
  }

  if (table.viewStructure && table.viewStructure.length > 0) {
    normalized.viewStructure = [...table.viewStructure].sort();
  }

  if (table.pivotRelationships && table.pivotRelationships.length > 0) {
    normalized.pivotRelationships = table.pivotRelationships
      .map((rel) => ({
        relatedTable: rel.relatedTable,
        pivotTable: rel.pivotTable,
      }))
      .sort((a, b) => {
        const relatedCompare = a.relatedTable.localeCompare(b.relatedTable);
        if (relatedCompare !== 0) {
          return relatedCompare;
        }
        return a.pivotTable.localeCompare(b.pivotTable);
      });
  }

  return normalized;
};

const normalizeColumns = (columns: IColumnInfo[]): IColumnInfo[] => {
  return columns
    .map(normalizeColumn)
    .sort((a, b) => a.column_name.localeCompare(b.column_name));
};

const normalizeColumn = (column: IColumnInfo): IColumnInfo => {
  const normalized: IColumnInfo = {
    column_name: column.column_name,
    data_type: column.data_type,
    is_nullable: column.is_nullable,
  };

  /* Normalize column_default: convert auto-increment patterns to AUTO_INCREMENT */
  if (column.column_default !== undefined && column.column_default !== null) {
    const defaultVal = column.column_default;
    /* Detect PostgreSQL sequence patterns and MySQL auto_increment */
    if (
      column.primary_key ||
      defaultVal.toLowerCase().includes('nextval') ||
      defaultVal.toLowerCase().includes('auto_increment')
    ) {
      normalized.column_default = 'AUTO_INCREMENT';
    } else {
      normalized.column_default = defaultVal;
    }
  }

  /* Add optional boolean properties only if true */
  if (column.primary_key) {
    normalized.primary_key = true;
  }

  if (column.unique) {
    normalized.unique = true;
  }

  /* Add foreign_key if it exists */
  if (column.foreign_key) {
    normalized.foreign_key = {
      foreign_table_name: column.foreign_key.foreign_table_name,
      foreign_column_name: column.foreign_key.foreign_column_name,
    };
  }

  return normalized;
};
