import type { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';

/**
 * Extracts a separator value from a dynamic property string
 * @param propertyString The property string, like 'getAllColumns(separator=",\n")'
 * @returns The separator value, or null if not found/valid
 */
export const extractSeparatorValue = (
  propertyString: string,
): string | null => {
  const separatorMatch = /\(separator=['"](.+)['"]\)/.exec(propertyString);
  const matchValue = separatorMatch?.[1];

  if (matchValue === undefined || matchValue === '') {
    return null;
  }

  // Process special escape sequences
  return matchValue
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');
};

/**
 * Processes dynamic property templates in content
 * @param content Template content with placeholders
 * @param replacements Object containing replacement values
 * @returns Processed content with dynamic properties resolved
 */
export const processDynamicProperties = (
  content: string,
  replacements: Replacements,
): string => {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, placeholder: string) => {
    const key = placeholder.trim();

    // Direct key access
    if (key in replacements) {
      const value = replacements[key];
      return Array.isArray(value) ? value.join(',') : value;
    }

    // Handle dynamic properties with separators
    if (key.includes('separator=')) {
      const baseProperty = key.split('(')[0];
      const baseArrayKey = `${baseProperty}()`;

      // Check if we have the base array property
      if (baseArrayKey in replacements) {
        const baseArray = replacements[baseArrayKey];
        if (Array.isArray(baseArray)) {
          const separator = extractSeparatorValue(key);
          if (separator !== null) {
            return baseArray.join(separator);
          }
        }
      }
    }

    // Handle indexed access - e.g., getColumns()[0]
    const indexMatch = /(.+)\(\)\[(\d+)\]/.exec(key);
    if (indexMatch) {
      const baseProp = indexMatch[1];
      const indexStr = indexMatch[2];
      const arrayKey = `${baseProp}()`;
      const index = parseInt(indexStr, 10);

      if (arrayKey in replacements) {
        const baseArray = replacements[arrayKey];
        if (Array.isArray(baseArray) && index < baseArray.length) {
          return baseArray[index];
        }
      }
    }

    // Return the original placeholder if not found
    return `{{${key}}}`;
  });
};

/**
 * Simple utility to join an array with a specific separator
 * @param array The array to join
 * @param separator The separator to use
 * @returns The joined string
 */
export const joinWithSeparator = (
  array: string[],
  separator: string,
): string => {
  return array.join(separator);
};
