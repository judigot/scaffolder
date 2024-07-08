interface IConversionParams {
  primitiveType: string;
  value: unknown;
  targetType: 'mysql' | 'postgresql' | 'typescript';
}

const typeMappings: Record<
  string,
  Record<IConversionParams['targetType'], string>
> = {
  number: { mysql: 'BIGINT', postgresql: 'BIGINT', typescript: 'number' },
  float: { mysql: 'FLOAT', postgresql: 'REAL', typescript: 'number' },
  decimal: {
    mysql: 'DECIMAL(10, 2)',
    postgresql: 'NUMERIC(10, 2)',
    typescript: 'number',
  },
  string: { mysql: 'TEXT', postgresql: 'TEXT', typescript: 'string' },
  boolean: { mysql: 'BOOLEAN', postgresql: 'BOOLEAN', typescript: 'boolean' },
  date: {
    mysql: 'TIMESTAMP(6)',
    postgresql: 'TIMESTAMPTZ(6)',
    typescript: 'Date',
  },
  default: { mysql: 'TEXT', postgresql: 'TEXT', typescript: 'string' },
};

const isDateString = (val: unknown): boolean => {
  return typeof val === 'string' && !isNaN(Date.parse(val));
};

const isFloat = (n: unknown): boolean => {
  return typeof n === 'number' && !Number.isInteger(n);
};

const isInteger = (n: unknown): boolean => {
  return typeof n === 'number' && Number.isInteger(n);
};

const convertType = ({
  primitiveType,
  value,
  targetType,
}: IConversionParams): string => {
  if (primitiveType === 'string' && isDateString(value)) {
    return typeMappings.date[targetType];
  }

  if (isFloat(value)) {
    return typeMappings.float[targetType];
  }

  if (isInteger(value)) {
    return typeMappings.number[targetType];
  }

  if (primitiveType === 'string') {
    return typeMappings.string[targetType];
  }

  if (primitiveType === 'boolean') {
    return typeMappings.boolean[targetType];
  }

  return typeMappings.default[targetType];
};

export default convertType;
