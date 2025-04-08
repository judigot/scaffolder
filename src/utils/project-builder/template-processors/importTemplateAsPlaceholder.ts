import { Replacements, ReplacementValue } from '@/utils/project-builder/interfaces/interfaces.ts';

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
  processedKeys: Set<string> = new Set(),
  path = '',
): ReplacementValue => {
  // If the template is an array, process each item
  if (Array.isArray(template)) {
    return template.map((item) => 
      typeof item === 'string'
        ? processStringPlaceholders(item, replacements, processedKeys, path)
        : item
    );
  }
  
  // If the template is a string, process placeholders
  if (typeof template === 'string') {
    return processStringPlaceholders(template, replacements, processedKeys, path);
  }
  
  // Return the original value if it's not a string or array
  return template;
};

/**
 * Processes placeholders in a string template
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
  // Replace all {{placeholders}} in the template
  return template.replace(/\{\{([^}]+)\}\}/g, (_match: string, placeholder: string) => {
    const key = placeholder.trim();
    
    // Check if this key exists in the replacements
    if (!(key in replacements)) {
      return `{{${String(key)}}}`;  // Keep the placeholder if not found
    }
    
    // Prevent circular references
    const newPath = path ? `${String(path)} -> ${String(key)}` : key;
    if (processedKeys.has(key)) {
      throw new Error(`Circular reference detected in template placeholders: ${String(newPath)}\nTo fix this issue, make sure properties don't reference each other in a circular way.`);
    }
    
    // Mark this key as processed for this recursion path
    processedKeys.add(key);
    
    // Get the replacement value
    const value = replacements[key];
    
    // Process the replacement value recursively if it's a string or array
    let processedValue: ReplacementValue;
    
    if (typeof value === 'string' && value.includes('{{')) {
      // Process nested placeholders in the replacement value
      processedValue = processStringPlaceholders(value, replacements, processedKeys, newPath);
    } else if (Array.isArray(value)) {
      // Process array values
      processedValue = value.map(item => 
        typeof item === 'string' && item.includes('{{')
          ? processStringPlaceholders(item, replacements, processedKeys, newPath)
          : item
      );
    } else {
      processedValue = value;
    }
    
    // Remove this key from processed keys as we're done with this path
    processedKeys.delete(key);
    
    // Convert array to string if needed
    return Array.isArray(processedValue)
      ? processedValue.join(', ')
      : String(processedValue);
  });
};
