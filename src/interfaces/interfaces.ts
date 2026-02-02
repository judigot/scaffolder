export type DBTypes = 'postgresql' | 'mysql';

export type IJSONSchema = Record<string, Record<string, unknown>[]>;

export interface IColumnInfoSlim {
  name: string;
  type: string;
  nullable?: true;
  default?: string | null;
  primaryKey?: true;
  unique?: true;
  foreign?: string;
}

export type ISchemaInfoSlim = {
  tableName: string;
  columns: IColumnInfoSlim[];
  isPivot?: true;
  viewQuery?: string;
  viewStructure?: string[];
  data?: Record<string, unknown>[];
}[];

export interface IColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string | null;
  primary_key?: true;
  unique?: true;
  foreign_key?: {
    foreign_table_name: string;
    foreign_column_name: string;
  };
}

/**
 * Table metadata interface.
 *
 * NOTE: When adding new properties that reference other tables or columns,
 * update validateSchemaInfo.ts to validate them.
 *
 * Table references (validated): foreignTables, childTables, hasOne, hasMany,
 *   belongsTo, belongsToMany, pivotRelationships.relatedTable, pivotRelationships.pivotTable
 * Column references (validated): ownerField, foreignKeys, compositePrimaryKey
 */
export interface ITableInfo {
  tableName: string;
  viewQuery?: string;
  viewStructure?: string[];
  foreignTables?: string[]; // References to other tables
  childTables?: string[]; // References to other tables
  isPivot?: true;
  isAuthResource?: true; // Table is a descendant of user table
  ownerField?: string; // Column name in this table's columnsInfo
  hasOne?: string[]; // References to other tables
  hasMany?: string[]; // References to other tables
  belongsTo?: string[]; // References to other tables
  belongsToMany?: string[]; // References to other tables
  pivotRelationships?: {
    relatedTable: string; // Reference to other table
    pivotTable: string; // Reference to other table
  }[];
  /**
   * Composite primary key - array of column names that together form the PK.
   * When set, individual columns should NOT have primary_key: true.
   * Example: ["provider_id", "provider_user_id"] for OAuth account tables.
   */
  compositePrimaryKey?: string[];
}

export interface ISchemaInfo extends ITableInfo {
  columnsInfo: IColumnInfo[];
  data?: Record<string, unknown>[];
  requiredColumns?: string[]; // One or none
  foreignKeys?: string[]; // One or none
}

export type ParsedJSONSchema = Record<string, Record<string, unknown>[]>;

export interface IIntrospectedSchemaInfo {
  table_name: string;
  view_query?: string | null;
  view_structure?: string[] | null;
  columns: IColumnInfo[];
  check_constraints: string[] | null;
  composite_unique_constraints: string[] | null;
}

export const isISchemaInfo = (data: unknown): data is ISchemaInfo => {
  // Only tableName and columnsInfo are required; all other fields are optional
  return (
    typeof data === 'object' &&
    data !== null &&
    'tableName' in data &&
    typeof data.tableName === 'string' &&
    'columnsInfo' in data &&
    Array.isArray(data.columnsInfo)
  );
};

export const isISchemaInfoArray = (data: unknown): data is ISchemaInfo[] => {
  return Array.isArray(data) && data.every(isISchemaInfo);
};

export const isITable = (data: unknown): data is IIntrospectedSchemaInfo => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'table_name' in data &&
    'columns' in data &&
    'check_constraints' in data &&
    'composite_unique_constraints' in data
  );
};

export const isITableArray = (
  data: unknown,
): data is IIntrospectedSchemaInfo[] => {
  return Array.isArray(data) && data.every(isITable);
};
