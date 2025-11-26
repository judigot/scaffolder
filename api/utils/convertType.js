import identifyTSPrimitiveType from '../utils/identifyTSPrimitiveType';
import { useMockDatabaseStore } from '../useMockDatabaseStore';
const isRecord = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};
const convertType = ({ value, targetType }) => {
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
        const firstValue = targetTypeValue[0];
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
      const firstValue = fallbackValue[0];
      return typeof firstValue === 'string' ? firstValue : '';
    }
    if (typeof fallbackValue === 'string') {
      return fallbackValue;
    }
  }
  return '';
};
export default convertType;
