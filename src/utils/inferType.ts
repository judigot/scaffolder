const inferType = (value: unknown): string => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'number' : 'float';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (value instanceof Date) {
    return 'Date';
  }
  return 'unknown';
};

export default inferType;
