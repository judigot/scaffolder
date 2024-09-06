export type DBTypes = 'postgresql' | 'mysql';

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
  composite_unique_constraints: string[];
}

export const isISchemaInfo = (data: unknown): data is ISchemaInfo => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'table' in data &&
    'tablePlural' in data &&
    'requiredColumns' in data &&
    'columnsInfo' in data &&
    'foreignTables' in data &&
    'foreignKeys' in data &&
    'childTables' in data &&
    'isPivot' in data &&
    'hasOne' in data &&
    'hasMany' in data &&
    'belongsTo' in data &&
    'belongsToMany' in data &&
    'pivotRelationships' in data
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
