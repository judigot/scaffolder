export const isISchemaInfo = (data) => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tableName' in data &&
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
export const isISchemaInfoArray = (data) => {
  return Array.isArray(data) && data.every(isISchemaInfo);
};
export const isITable = (data) => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'table_name' in data &&
    'columns' in data &&
    'check_constraints' in data &&
    'composite_unique_constraints' in data
  );
};
export const isITableArray = (data) => {
  return Array.isArray(data) && data.every(isITable);
};
