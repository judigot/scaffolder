const mapTypeToSQL = ({
  type,
  value,
}: {
  type: string;
  value: unknown;
}): string => {
  switch (type) {
    case 'number':
      return 'BIGINT';
    case 'float':
      return 'FLOAT';
    case 'string':
      if (typeof value === 'string') {
        const parsedDate = Date.parse(value);
        if (!isNaN(parsedDate)) {
          return 'TIMESTAMP';
        }
      }
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
