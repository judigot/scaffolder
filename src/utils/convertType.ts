import identifyType from './identifyType';

interface IConversionParams {
  value: unknown;
  targetType:
    | 'mysql'
    | 'postgresql'
    | 'typescript'
    | 'postgresql-introspected'
    | 'mysql-introspected';
}

export const typeMappings: Record<
  string,
  {
    mysql: string;
    postgresql: string;
    typescript: string;
    'postgresql-introspected': string[];
    'mysql-introspected': string[];
  }
> = {
  primaryKey: {
    mysql: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
    postgresql: 'BIGSERIAL PRIMARY KEY',
    typescript: 'number',
    'postgresql-introspected': ['bigint', 'serial', 'serial8', 'serial4'],
    'mysql-introspected': ['bigint'],
  },
  password: {
    mysql: 'CHAR(60)',
    postgresql: 'CHAR(60)',
    typescript: 'string',
    'postgresql-introspected': ['character', 'char'],
    'mysql-introspected': ['char(60)'],
  },
  number: {
    mysql: 'BIGINT',
    postgresql: 'BIGINT',
    typescript: 'number',
    'postgresql-introspected': ['bigint', 'int8', 'int4', 'int2'],
    'mysql-introspected': ['bigint', 'int', 'smallint'],
  },
  float: {
    mysql: 'DECIMAL(10, 2)',
    postgresql: 'NUMERIC(10, 2)',
    typescript: 'number',
    'postgresql-introspected': [
      'numeric',
      'decimal',
      'real',
      'double precision',
    ],
    'mysql-introspected': ['decimal(10,2)', 'float', 'double'],
  },
  string: {
    mysql: 'TEXT',
    postgresql: 'TEXT',
    typescript: 'string',
    'postgresql-introspected': ['text', 'character varying', 'varchar'],
    'mysql-introspected': ['text', 'varchar'],
  },
  boolean: {
    mysql: 'BOOLEAN',
    postgresql: 'BOOLEAN',
    typescript: 'boolean',
    'postgresql-introspected': ['boolean', 'bool'],
    'mysql-introspected': ['tinyint(1)'],
  },
  Date: {
    mysql: 'TIMESTAMP(6)',
    postgresql: 'TIMESTAMPTZ(6)',
    typescript: 'Date',
    'postgresql-introspected': [
      'timestamp with time zone',
      'timestamptz',
      'timestamp',
    ],
    'mysql-introspected': ['timestamp'],
  },
};

const convertType = ({ value, targetType }: IConversionParams): string => {
  const identifiedType = identifyType(value);
  if (identifiedType in typeMappings) {
    const targetTypeValue = typeMappings[identifiedType][targetType];
    if (Array.isArray(targetTypeValue)) {
      return targetTypeValue[0]; // Or handle arrays in a more appropriate way if needed
    }
    return targetTypeValue;
  }
  const fallbackValue = typeMappings.string[targetType];
  if (Array.isArray(fallbackValue)) {
    return fallbackValue[0]; // Or handle arrays in a more appropriate way if needed
  }
  return fallbackValue; // Fallback to string if type not found
};

export default convertType;
