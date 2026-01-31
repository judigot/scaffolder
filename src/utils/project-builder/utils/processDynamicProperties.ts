import type { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';
import {
  parseFunctionCall,
  processIndexFunction,
  processTimestampFunction,
} from '@/utils/project-builder/utils/placeholderFunctions.ts';

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
 * Process a single placeholder key and return the replacement value
 */
const processSinglePlaceholder = (
  key: string,
  replacements: Replacements,
  originalPlaceholder: string,
): string => {
  // Direct key access
  if (key in replacements) {
    const value = replacements[key];
    return Array.isArray(value) ? value.join(',') : value;
  }

  // Handle function calls (index, timestamp)
  const functionCall = parseFunctionCall(key);
  if (functionCall.functionName === 'index') {
    const currentIndexStr = replacements.tableIndex;
    const totalTablesStr = replacements.totalTables;
    const currentIndex =
      typeof currentIndexStr === 'string'
        ? Number.parseInt(currentIndexStr, 10)
        : 0;
    const totalTables =
      typeof totalTablesStr === 'string'
        ? Number.parseInt(totalTablesStr, 10)
        : 0;
    return processIndexFunction(
      functionCall.args,
      Number.isNaN(currentIndex) ? 0 : currentIndex,
      Number.isNaN(totalTables) ? 0 : totalTables,
    );
  }

  if (functionCall.functionName === 'timestamp') {
    // Use tableIndex as offset (in seconds, converted to milliseconds) to ensure unique timestamps
    // This preserves the order of tables while ensuring no collisions
    // Using seconds ensures uniqueness even for formats that only include second-level precision
    const tableIndexStr = replacements.tableIndex;
    const tableIndex =
      typeof tableIndexStr === 'string'
        ? Number.parseInt(tableIndexStr, 10)
        : 0;
    // Add seconds based on index, converted to milliseconds (1000ms = 1 second)
    // This ensures timestamps are unique while preserving order, even for second-level formats
    const offsetMs = Number.isNaN(tableIndex) ? 0 : tableIndex * 1000;
    return processTimestampFunction(functionCall.args, offsetMs);
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
  return originalPlaceholder;
};

/**
 * Processes dynamic property templates in content
 * Supports both {{...}} (legacy) and <@@>...</@@> (new) syntax
 * @param content Template content with placeholders
 * @param replacements Object containing replacement values
 * @returns Processed content with dynamic properties resolved
 */
export const processDynamicProperties = (
  content: string,
  replacements: Replacements,
): string => {
  // First, process <@@>...</@@> placeholders (new syntax)
  let result = content.replace(/<@@>([^<]+)<\/@@>/g, (_, placeholder: string) =>
    processSinglePlaceholder(
      placeholder.trim(),
      replacements,
      `<@@>${placeholder}</@@>`,
    ),
  );

  // Then, process {{...}} placeholders (legacy syntax)
  result = result.replace(/\{\{([^}]+)\}\}/g, (_, placeholder: string) =>
    processSinglePlaceholder(
      placeholder.trim(),
      replacements,
      `{{${placeholder}}}`,
    ),
  );

  return result;
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
