import identifyType from './identifyType';

interface IConversionParams {
  value: unknown;
  targetType: 'mysql' | 'postgresql' | 'typescript' | 'postgresql-introspected' | 'mysql-introspected';
}

export const typeMappings: Record<
  string,
  Record<IConversionParams['targetType'], string>
> = {
  primaryKey: {
    mysql: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
    postgresql: 'BIGSERIAL PRIMARY KEY',
    typescript: 'number',
    'postgresql-introspected': 'bigint',
    'mysql-introspected': 'bigint',
  },
  password: { 
    mysql: 'CHAR(60)', 
    postgresql: 'CHAR(60)', 
    typescript: 'string',
    'postgresql-introspected': 'character',
    'mysql-introspected': 'char(60)',
  },
  number: { 
    mysql: 'BIGINT', 
    postgresql: 'BIGINT', 
    typescript: 'number',
    'postgresql-introspected': 'bigint',
    'mysql-introspected': 'bigint',
  },
  float: {
    mysql: 'DECIMAL(10, 2)', 
    postgresql: 'NUMERIC(10, 2)', 
    typescript: 'number',
    'postgresql-introspected': 'numeric',
    'mysql-introspected': 'decimal(10,2)',
  },
  string: { 
    mysql: 'TEXT', 
    postgresql: 'TEXT', 
    typescript: 'string',
    'postgresql-introspected': 'text',
    'mysql-introspected': 'text',
  },
  boolean: { 
    mysql: 'BOOLEAN', 
    postgresql: 'BOOLEAN', 
    typescript: 'boolean',
    'postgresql-introspected': 'boolean',
    'mysql-introspected': 'tinyint(1)',
  },
  Date: { 
    mysql: 'TIMESTAMP(6)', 
    postgresql: 'TIMESTAMPTZ(6)', 
    typescript: 'Date',
    'postgresql-introspected': 'timestamp with time zone',
    'mysql-introspected': 'timestamp',
  },
  bigint: { 
    mysql: 'BIGINT', 
    postgresql: 'BIGINT', 
    typescript: 'number',
    'postgresql-introspected': 'bigint',
    'mysql-introspected': 'bigint',
  },
  text: { 
    mysql: 'TEXT', 
    postgresql: 'TEXT', 
    typescript: 'string',
    'postgresql-introspected': 'text',
    'mysql-introspected': 'text',
  },
  'timestamp with time zone': { 
    mysql: 'TIMESTAMP', 
    postgresql: 'TIMESTAMPTZ', 
    typescript: 'Date',
    'postgresql-introspected': 'timestamp with time zone',
    'mysql-introspected': 'timestamp',
  },
  character: { 
    mysql: 'CHAR(60)', 
    postgresql: 'CHAR(60)', 
    typescript: 'string',
    'postgresql-introspected': 'character',
    'mysql-introspected': 'char(60)',
  },
  'character varying': { 
    mysql: 'VARCHAR(255)', 
    postgresql: 'VARCHAR(255)', 
    typescript: 'string',
    'postgresql-introspected': 'character varying',
    'mysql-introspected': 'varchar(255)',
  },
  'timestamp without time zone': { 
    mysql: 'TIMESTAMP', 
    postgresql: 'TIMESTAMP', 
    typescript: 'Date',
    'postgresql-introspected': 'timestamp without time zone',
    'mysql-introspected': 'timestamp',
  },
};

const convertType = ({ value, targetType }: IConversionParams): string => {
  const identifiedType = identifyType(value);
  if (identifiedType in typeMappings) {
    return typeMappings[identifiedType][targetType];
  }
  return typeMappings.string[targetType]; // Fallback to string if type not found
};

export default convertType;
