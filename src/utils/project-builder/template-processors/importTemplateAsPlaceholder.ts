import type {
  Replacements,
  ReplacementValue,
} from '@/utils/project-builder/interfaces/interfaces.ts';
import { resolvePlaceholderValue } from '@/utils/project-builder/utils/placeholderTransforms.ts';

/**
 * Recursively processes placeholders in a template by replacing them with values
 * from the replacements object. This allows properties to reference each other.
 *
 * @param template The template string or array with placeholders
 * @param replacements Object containing key-value pairs for replacements
 * @param processedKeys Set of keys that have already been processed (to detect circular references)
 * @param path Current path in the recursion (for error reporting)
 * @returns The processed template with all placeholders replaced
 */
export const importTemplateAsPlaceholder = (
  template: ReplacementValue,
  replacements: Replacements,
  processedKeys = new Set<string>(),
  path = '',
): ReplacementValue => {
  // If the template is an array, process each item
  if (Array.isArray(template)) {
    return template.map((item) =>
      typeof item === 'string'
        ? processStringPlaceholders(item, replacements, processedKeys, path)
        : item,
    );
  }

  // If the template is a string, process placeholders
  if (typeof template === 'string') {
    return processStringPlaceholders(
      template,
      replacements,
      processedKeys,
      path,
    );
  }

  // Return the original value if it's not a string or array
  return template;
};

/**
 * Replaces a single placeholder with its value from replacements
 *
 * @param key The placeholder key (trimmed)
 * @param replacements Object containing key-value pairs for replacements
 * @param processedKeys Set of keys that have already been processed
 * @param path Current path in the recursion
 * @param originalPlaceholder The original placeholder string to return if not found
 * @returns The replacement value or original placeholder
 */
const replaceSinglePlaceholder = (
  key: string,
  replacements: Replacements,
  processedKeys: Set<string>,
  path: string,
  originalPlaceholder: string,
): string => {
  // Skip function calls (index, timestamp) - they should be processed by processDynamicProperties
  if (/^(index|timestamp)\(/.test(key)) {
    return originalPlaceholder;
  }

  const resolvedPlaceholder = resolvePlaceholderValue(key, replacements);
  if (resolvedPlaceholder === undefined) {
    return originalPlaceholder;
  }

  const { sourceKey, value } = resolvedPlaceholder;

  // Prevent circular references
  const newPath = path ? `${path} -> ${sourceKey}` : sourceKey;
  if (processedKeys.has(sourceKey)) {
    throw new Error(
      `Circular reference detected in template placeholders: ${newPath}\nTo fix this issue, make sure properties don't reference each other in a circular way.`,
    );
  }

  // Mark this key as processed for this recursion path
  processedKeys.add(sourceKey);

  // Process the replacement value recursively if it's a string or array
  let processedValue: ReplacementValue;

  if (typeof value === 'string' && hasPlaceholders(value)) {
    // Process nested placeholders in the replacement value
    processedValue = processStringPlaceholders(
      value,
      replacements,
      processedKeys,
      newPath,
    );
  } else if (Array.isArray(value)) {
    // Process array values
    processedValue = value.map((item) =>
      typeof item === 'string' && hasPlaceholders(item)
        ? processStringPlaceholders(item, replacements, processedKeys, newPath)
        : item,
    );
  } else {
    processedValue = value;
  }

  // Remove this key from processed keys as we're done with this path
  processedKeys.delete(sourceKey);

  // Convert array to string if needed
  return Array.isArray(processedValue)
    ? processedValue.join(', ')
    : processedValue;
};

/**
 * Checks if a string contains any placeholder syntax
 */
const hasPlaceholders = (text: string): boolean => {
  return text.includes('{{') || text.includes('<@@>');
};

/**
 * Processes placeholders in a string template
 * Supports both {{placeholder}} and <@@>placeholder</@@> syntax
 *
 * @param template String template with placeholders
 * @param replacements Object containing key-value pairs for replacements
 * @param processedKeys Set of keys that have already been processed
 * @param path Current path in the recursion
 * @returns Processed string with all placeholders replaced
 */
const processStringPlaceholders = (
  template: string,
  replacements: Replacements,
  processedKeys: Set<string>,
  path: string,
): string => {
  // First, replace all <@@>placeholder</@@> in the template (new syntax)
  let result = template.replace(
    /<@@>([^<]+)<\/@@>/g,
    (_match: string, placeholder: string) => {
      const key = placeholder.trim();
      return replaceSinglePlaceholder(
        key,
        replacements,
        processedKeys,
        path,
        `<@@>${placeholder}</@@>`,
      );
    },
  );

  // Then, replace all {{placeholder}} in the template (legacy syntax)
  result = result.replace(
    /\{\{([^}]+)\}\}/g,
    (_match: string, placeholder: string) => {
      const key = placeholder.trim();
      return replaceSinglePlaceholder(
        key,
        replacements,
        processedKeys,
        path,
        `{{${placeholder}}}`,
      );
    },
  );

  return result;
};
