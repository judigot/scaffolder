import { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';

/**
 * Type guard to check if a value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extracts placeholders from a YAML structure for placeholder reference checking.
 * This traverses the YAML structure and collects all key-value pairs where the value
 * may contain placeholder references.
 * 
 * @param yamlObj The parsed YAML structure to extract placeholders from
 * @returns An object containing key-value pairs with potential placeholders
 */
export const extractPlaceholdersFromYaml = (yamlObj: unknown): Replacements => {
  const placeholders: Replacements = {};
  
  const processNode = (
    node: unknown,
    path = '',
    keyPath: string[] = []
  ): void => {
    // Process arrays
    if (Array.isArray(node)) {
      // For direct array values at a key, add them to the placeholders
      if (keyPath.length > 0) {
        const key = keyPath[keyPath.length - 1];
        placeholders[key] = node
          .filter((item): item is string => typeof item === 'string')
          .map(String);
      }
      
      // Continue processing each array item
      node.forEach((item, index) => {
        processNode(item, `${path}[${String(index)}]`, keyPath);
      });
    }
    // Process objects
    else if (isRecord(node)) {
      for (const [key, value] of Object.entries(node)) {
        const newKeyPath = [...keyPath, key];
        const newPath = path ? `${path}.${key}` : key;
        
        // For string values, add them to the placeholders
        if (typeof value === 'string') {
          placeholders[key] = value;
        }
        // For array values, they'll be processed in the array condition
        else if (Array.isArray(value)) {
          placeholders[key] = value
            .filter((item): item is string => typeof item === 'string')
            .map(String);
        }
        
        // Continue processing nested structures
        processNode(value, newPath, newKeyPath);
      }
    }
  };
  
  // Start processing from the root
  if (isRecord(yamlObj)) {
    processNode(yamlObj);
  }
  
  return placeholders;
}; 