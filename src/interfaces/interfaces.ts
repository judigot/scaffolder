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
