/**
 * Detects circular references in placeholder values within a replacements object.
 * For example, if property A references property B, and property B references property A,
 * this would be detected as a circular reference.
 *
 * @param replacements Object containing key-value pairs for replacements
 * @returns Object indicating if a circular reference was found and the circular path
 */
export const detectCircularPlaceholderImports = (replacements) => {
  // Track which keys have been visited for all traversal paths
  const visited = new Set();
  // Track keys in the current traversal path (to detect cycles)
  const recStack = new Set();
  // Pattern to detect placeholders
  const placeholderPattern = /\{\{([^}]+)\}\}/g;
  // For tracking detected circular references
  let result = {
    hasCircularReference: false,
    circularPath: '',
  };
  /**
   * Helper function to recursively check for circular references
   * starting from a specific key
   */
  const checkForCircularReferences = (key, path = []) => {
    // If we've already seen this key in current path, we found a cycle
    if (recStack.has(key)) {
      const cyclePath = [...path, key].join(' → ');
      result = {
        hasCircularReference: true,
        circularPath: cyclePath,
      };
      return true;
    }
    // If we've already checked this key in another path and found no cycles,
    // we can skip it
    if (visited.has(key)) {
      return false;
    }
    // Add to visited and current path
    visited.add(key);
    recStack.add(key);
    const newPath = [...path, key];
    // Get the value for this key
    const value = replacements[key];
    // Check for placeholders in string values
    if (typeof value === 'string') {
      let match;
      // Reset regex internal state
      placeholderPattern.lastIndex = 0;
      // Find all placeholders in the value
      while ((match = placeholderPattern.exec(value)) !== null) {
        const referencedKey = match[1].trim();
        // Check if the referenced key exists
        if (referencedKey in replacements) {
          // Recursively check for cycles
          if (checkForCircularReferences(referencedKey, newPath)) {
            return true;
          }
        }
      }
    }
    // Check for placeholders in array values
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          let match;
          // Reset regex internal state
          placeholderPattern.lastIndex = 0;
          // Find all placeholders in the array item
          while ((match = placeholderPattern.exec(item)) !== null) {
            const referencedKey = match[1].trim();
            // Check if the referenced key exists
            if (referencedKey in replacements) {
              // Recursively check for cycles
              if (checkForCircularReferences(referencedKey, newPath)) {
                return true;
              }
            }
          }
        }
      }
    }
    // Remove from current path as we're done with this branch
    recStack.delete(key);
    return false;
  };
  // Check each key in the replacements object
  for (const key of Object.keys(replacements)) {
    if (checkForCircularReferences(key)) {
      return result;
    }
  }
  return result;
};
