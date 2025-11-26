import { findFileInStructure } from '../../../utils/project-builder/utils/findFileInStructure';
import {
  IMPORT_PROJECT_REGEX,
  PROJECT_ACTIONS,
} from '../../../utils/project-builder/constants/projectActions';
import { parse } from 'yaml';
/**
 * Type guard to check if a value is a non-null object
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Extract import paths from YAML content
 *
 * @param content YAML content to parse
 * @returns Array of import paths found in the content
 */
function extractImportPaths(content) {
  const importPaths = [];
  const parsedYaml = parse(content);
  // Extract imports from root level keys
  if (isRecord(parsedYaml)) {
    // Handle root level import keys (IMPORT_PROJECT(path):)
    const rootImportKeys = Object.keys(parsedYaml).filter((key) =>
      key.startsWith(PROJECT_ACTIONS.IMPORT_PROJECT),
    );
    // Process each import key to extract the path
    for (const key of rootImportKeys) {
      const importPathRegex = /IMPORT_PROJECT\((.*?)\)(:?)$/;
      const execResult = importPathRegex.exec(key);
      // Get the captured path if it exists and ensure it's not empty
      const capturedPath = execResult?.[1] ?? '';
      if (capturedPath !== '') {
        importPaths.push(capturedPath);
      }
    }
    // Process nested imports recursively
    const processNode = (node) => {
      if (Array.isArray(node)) {
        // For array nodes, look for strings starting with IMPORT_PROJECT
        for (const item of node) {
          if (
            typeof item === 'string' &&
            item.startsWith(`${PROJECT_ACTIONS.IMPORT_PROJECT}(`)
          ) {
            const execResult = IMPORT_PROJECT_REGEX.exec(item);
            // Get the captured path if it exists and ensure it's not empty
            const capturedPath = execResult?.[1] ?? '';
            if (capturedPath !== '') {
              importPaths.push(capturedPath);
            }
          } else if (isRecord(item)) {
            processNode(item);
          }
        }
      } else if (isRecord(node)) {
        // For object nodes, process all values
        for (const [_key, value] of Object.entries(node)) {
          processNode(value);
        }
      }
    };
    // Process all nodes in the YAML
    processNode(parsedYaml);
  }
  return importPaths;
}
/**
 * Detects circular imports in project YAML files
 *
 * @param filePath The starting file path to check
 * @param userFiles The user's file structure
 * @param visited Set of already visited files (for detecting cycles)
 * @param recStack Current recursion stack (chain of imports)
 * @returns Object indicating if a circular import was found and the cycle chain
 */
export const detectCircularImports = (
  filePath,
  userFiles,
  visited = new Set(),
  recStack = [],
) => {
  // Normalize the file path for consistent matching
  const normalizedPath = filePath.trim();
  // Check if this file is already in our current import chain
  const cycleIndex = recStack.indexOf(normalizedPath);
  if (cycleIndex !== -1) {
    // We found a cycle! Construct the cycle chain string
    const cycle = [...recStack.slice(cycleIndex), normalizedPath];
    const cycleChain = cycle.join(' → ');
    return {
      hasCircularImport: true,
      cycleChain,
    };
  }
  // If we've already visited this file in another branch without finding a cycle,
  // we don't need to process it again
  if (visited.has(normalizedPath)) {
    return {
      hasCircularImport: false,
      cycleChain: '',
    };
  }
  // Add to visited set and current recursion stack
  visited.add(normalizedPath);
  recStack.push(normalizedPath);
  // Find the file in the user's structure
  const file = findFileInStructure(normalizedPath, userFiles);
  // Check if the file exists and has content
  if (file && typeof file.content === 'string' && file.content.length > 0) {
    // Extract all import paths from the file
    const importPaths = extractImportPaths(file.content);
    // Check each import path for circular references
    for (const importPath of importPaths) {
      const result = detectCircularImports(
        importPath,
        userFiles,
        visited,
        recStack,
      );
      // If a cycle was found, propagate it up
      if (result.hasCircularImport) {
        return result;
      }
    }
  }
  // No cycle found in this branch, remove from recursion stack
  recStack.pop();
  return {
    hasCircularImport: false,
    cycleChain: '',
  };
};
