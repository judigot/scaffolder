import type { IStructure } from '@/components/FileViewer.tsx';
import { USE_USER_ENV_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

/**
 * Scans the generated file structure for USE_USER_ENV patterns.
 * This detects files that either:
 * 1. Still contain USE_USER_ENV patterns (weren't replaced)
 * 2. Were generated from templates that used USE_USER_ENV
 *
 * Since USE_USER_ENV gets replaced during processing, we check the final output
 * for any remaining patterns (which indicates the key didn't exist or wasn't replaced).
 * We also need to track during building which files used it.
 *
 * @param structure - The generated file structure
 * @returns Array of file paths that contain or used USE_USER_ENV
 */
export function detectUserEnvInTemplates(structure: IStructure): string[] {
  const filesUsingUserEnv: string[] = [];

  const scanStructure = (items: IStructure, basePath = ''): void => {
    for (const item of items) {
      const currentPath =
        basePath === '' ? item.name : `${basePath}/${item.name}`;

      if (item.type === 'file') {
        // Check if the file content contains USE_USER_ENV patterns
        // This catches cases where USE_USER_ENV wasn't replaced (e.g., key doesn't exist)
        if (USE_USER_ENV_REGEX.test(item.content)) {
          filesUsingUserEnv.push(currentPath);
        }
      } else {
        // Recursively scan folder contents
        scanStructure(item.children, currentPath);
      }
    }
  };

  scanStructure(structure);

  return filesUsingUserEnv;
}
