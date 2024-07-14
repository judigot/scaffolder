import identifyType from './identifyType';

interface IConversionParams {
  value: unknown;
  targetType: 'mysql' | 'postgresql' | 'typescript';
}

export const typeMappings: Record<
  string,
  Record<IConversionParams['targetType'], string>
> = {
  primaryKey: {
    mysql: 'BIGINT PRIMARY KEY AUTO_INCREMENT',
    postgresql: 'BIGSERIAL PRIMARY KEY',
    typescript: 'number',
  },
  password: { mysql: 'CHAR(60)', postgresql: 'CHAR(60)', typescript: 'string' },

  number: { mysql: 'BIGINT', postgresql: 'BIGINT', typescript: 'number' },
  float: {
    mysql: 'DECIMAL(10, 2)',
    postgresql: 'NUMERIC(10, 2)',
    typescript: 'number',
  },
  string: { mysql: 'TEXT', postgresql: 'TEXT', typescript: 'string' },
  boolean: { mysql: 'BOOLEAN', postgresql: 'BOOLEAN', typescript: 'boolean' },
  Date: {
    mysql: 'TIMESTAMP(6)',
    postgresql: 'TIMESTAMPTZ(6)',
    typescript: 'Date',
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
