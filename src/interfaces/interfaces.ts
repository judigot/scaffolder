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

export interface ITableInfo {
  tableName: string;
  viewQuery?: string;
  viewStructure?: string[];
  foreignTables?: string[]; // One or none
  childTables?: string[]; // One or none
  isPivot?: true;
  isAuthResource?: true; // Table is a descendant of user table
  ownerField?: string; // FK field linking to user (e.g., "user_id")
  hasOne?: string[]; // One or none
  hasMany?: string[]; // One or none
  belongsTo?: string[]; // One or none
  belongsToMany?: string[]; // One or none
  pivotRelationships?: {
    relatedTable: string;
    pivotTable: string;
  }[];
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
