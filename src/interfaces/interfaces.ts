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
  check_constraints?: unknown[];
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

export interface ITable {
  table_name: string;
  columns: IColumnInfo[];
  check_constraints: string[];
}
// prettier-ignore
export const isITableArray = ( data: unknown, ): data is ITable[] => { return ( Array.isArray(data) && data.every( (item) => item !== null && typeof item === 'object' && 'table_name' in item && 'columns' in item && 'check_constraints' in item, ) ); };

export interface ITableMySQL {
  TABLE_NAME: string;
  table_definition: {
    columns: IColumnInfo[];
  };
}
// prettier-ignore
export const isITableMySQLArray = ( data: unknown, ): data is ITableMySQL[] => { return ( Array.isArray(data) && data.every( (item) => item !== null && typeof item === 'object' && 'TABLE_NAME' in item && 'table_definition' in item, ) ); };
