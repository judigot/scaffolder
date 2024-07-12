const identifyType = (value: unknown): string => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'number' : 'float';
  }

  if (value instanceof Date) {
    return 'Date';
  }

  if (typeof value === 'string' && !isNaN(Date.parse(value))) {
    return 'Date';
  }

  return typeof value;
};

export default identifyType;
