const mapTypeToTypescriptType = (types: string[], value?: unknown): string => {
  if (types.includes('string')) {
    if (typeof value === 'string') {
      const parsedDate = Date.parse(value);
      if (!isNaN(parsedDate)) {
        return 'Date';
      }
    }
    return 'string';
  }
  if (types.includes('float') || types.includes('number')) {
    return 'number';
  }
  if (types.includes('boolean')) {
    return 'boolean';
  }
  return 'unknown';
};

export default mapTypeToTypescriptType;
