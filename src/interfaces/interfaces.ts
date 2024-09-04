export interface IColumnInfo {
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

export interface ISchemaInfo {
  table: string;
  tablePlural: string;
  requiredColumns: string[];
  columnsInfo: IColumnInfo[];
  foreignTables: string[];
  foreignKeys: string[];
  childTables: string[];
  isPivot: boolean;
  hasOne: string[];
  hasMany: string[];
  belongsTo: string[];
  belongsToMany: string[];
  pivotRelationships: {
    relatedTable: string;
    pivotTable: string | null;
  }[];
}

export interface IIntrospectedSchemaInfo {
  table_name: string;
  columns: IColumnInfo[];
  check_constraints: string[];
}

export type DBTypes = 'postgresql' | 'mysql';

// prettier-ignore
export const isITable = (data: unknown): data is IIntrospectedSchemaInfo => { return ( typeof data === 'object' && data !== null && 'table_name' in data && 'columns' in data && 'check_constraints' in data ); };
// prettier-ignore
export const isITableArray = ( data: unknown, ): data is IIntrospectedSchemaInfo[] => { return ( Array.isArray(data) && data.every( (item) => item !== null && typeof item === 'object' && 'table_name' in item && 'columns' in item && 'check_constraints' in item, ) ); };
