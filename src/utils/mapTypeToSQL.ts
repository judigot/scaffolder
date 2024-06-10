const mapTypeToSQL = (type: string): string => {
  switch (type) {
    case 'number':
      return 'BIGINT';
    case 'float':
      return 'FLOAT';
    case 'string':
      return 'TEXT';
    case 'boolean':
      return 'BOOLEAN';
    case 'Date':
      return 'TIMESTAMP';
    default:
      return 'TEXT';
  }
};

export default mapTypeToSQL;
