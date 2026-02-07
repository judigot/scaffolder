import pluralize from 'pluralize';
import { changeCase } from '@/utils/common.ts';
import type {
  Replacements,
  ReplacementValue,
} from '@/utils/project-builder/interfaces/interfaces.ts';

export interface IResolvedPlaceholderValue {
  sourceKey: string;
  value: ReplacementValue;
}

const toStringValue = (value: ReplacementValue): string => {
  return Array.isArray(value) ? value.join(', ') : value;
};

const applyTransform = (value: string, transform: string): string => {
  const caseFormats = changeCase(value);

  switch (transform) {
    case 'pascalCase':
      return caseFormats.pascalCase;
    case 'camelCase':
      return caseFormats.camelCase;
    case 'kebabCase':
      return caseFormats.kebabCase;
    case 'snakeCase':
      return caseFormats.snakeCase;
    case 'titleCase':
      return caseFormats.titleCase;
    case 'sentenceCase':
      return caseFormats.sentenceCase;
    case 'upperCase':
      return value.toUpperCase();
    case 'lowerCase':
      return value.toLowerCase();
    case 'plural':
      return pluralize(value);
    case 'singular':
      return pluralize.singular(value);
    default:
      return value;
  }
};

const applyTransformChain = (value: string, transforms: string[]): string => {
  return transforms.reduce((currentValue, transform) => {
    return applyTransform(currentValue, transform);
  }, value);
};

export const resolvePlaceholderValue = (
  key: string,
  replacements: Replacements,
): IResolvedPlaceholderValue | undefined => {
  if (key in replacements) {
    return {
      sourceKey: key,
      value: replacements[key],
    };
  }

  const keyParts = key.split('.');
  if (keyParts.length < 2) {
    return undefined;
  }

  for (let splitIndex = keyParts.length - 1; splitIndex > 0; splitIndex--) {
    const baseKey = keyParts.slice(0, splitIndex).join('.');
    if (!(baseKey in replacements)) {
      continue;
    }

    const transforms = keyParts.slice(splitIndex);
    const baseValue = toStringValue(replacements[baseKey]);
    return {
      sourceKey: baseKey,
      value: applyTransformChain(baseValue, transforms),
    };
  }

  return undefined;
};
