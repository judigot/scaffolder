import identifyTSPrimitiveType from '@/utils/identifyTSPrimitiveType.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { isRecord } from '@/utils/typeGuards.ts';

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
  const typeMappings = useMockDatabaseStore.getState().typeMappings;
  if (!typeMappings || !isRecord(typeMappings)) {
    return '';
  }

  const identifiedType = identifyTSPrimitiveType(value);
  if (identifiedType in typeMappings) {
    const mapping = typeMappings[identifiedType];
    if (isRecord(mapping) && targetType in mapping) {
      const targetTypeValue = mapping[targetType];
      if (Array.isArray(targetTypeValue) && targetTypeValue.length > 0) {
        const firstValue: unknown = targetTypeValue[0];
        return typeof firstValue === 'string' ? firstValue : '';
      }
      if (typeof targetTypeValue === 'string') {
        return targetTypeValue;
      }
    }
  }

  const stringMapping = typeMappings.string;
  if (isRecord(stringMapping) && targetType in stringMapping) {
    const fallbackValue = stringMapping[targetType];
    if (Array.isArray(fallbackValue) && fallbackValue.length > 0) {
      const firstValue: unknown = fallbackValue[0];
      return typeof firstValue === 'string' ? firstValue : '';
    }
    if (typeof fallbackValue === 'string') {
      return fallbackValue;
    }
  }

  return '';
};

export default convertType;
