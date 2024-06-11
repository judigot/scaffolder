const mapTypeToTypescriptType = (type: string, value?: unknown): string => {
  switch (type) {
    case 'number':
      return 'number';
    case 'float':
      return 'number';
    case 'string':
      if (typeof value === 'string') {
        const parsedDate = Date.parse(value);
        if (!isNaN(parsedDate)) {
          return 'Date';
        }
      }
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'Date':
      return 'Date';
    default:
      return 'unknown';
  }
};

export default mapTypeToTypescriptType;
