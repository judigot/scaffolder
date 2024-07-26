import { typeMappings } from '@/utils/mappings';
import identifyTSPrimitiveType from './identifyTSPrimitiveType';

interface IConversionParams {
  value: unknown;
  targetType:
    | 'mysql'
    | 'postgresql'
    | 'typescript'
    | 'postgresql-introspected'
    | 'mysql-introspected';
}

const convertType = ({ value, targetType }: IConversionParams): string => {
  const identifiedType = identifyTSPrimitiveType(value);
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
