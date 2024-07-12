import identifyType from './identifyType';

interface IConversionParams {
  value: unknown;
  targetType: 'mysql' | 'postgresql' | 'typescript';
}

const typeMappings: Record<
  string,
  Record<IConversionParams['targetType'], string>
> = {
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
  // default: { mysql: 'TEXT', postgresql: 'TEXT', typescript: 'string' },
};

const convertType = ({ value, targetType }: IConversionParams): string => {
  return typeMappings[identifyType(value)][targetType];
};

export default convertType;
