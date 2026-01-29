import type { IStructure } from '@/components/FileViewer.tsx';
import { USE_USER_ENV_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

export interface IUserEnvDetectionResult {
  hasUserEnv: boolean;
  locations: {
    filePath: string;
    match: string;
  }[];
}

/**
 * Recursively scans an IStructure for any remaining USE_USER_ENV patterns.
 * This is used to prevent committing secrets to GitHub repositories.
 *
 * @param structure - The file/folder structure to scan
 * @param basePath - The current path being scanned (for reporting locations)
 * @returns Detection result with locations where USE_USER_ENV was found
 */
export function detectUserEnvInStructure(
  structure: IStructure,
  basePath = '',
): IUserEnvDetectionResult {
  const locations: IUserEnvDetectionResult['locations'] = [];

  for (const item of structure) {
    const currentPath =
      basePath === '' ? item.name : `${basePath}/${item.name}`;

    if (item.type === 'file') {
      // Check if the file content contains USE_USER_ENV patterns
      const matches = item.content.match(USE_USER_ENV_REGEX);
      if (matches !== null && matches.length > 0) {
        matches.forEach((match) => {
          locations.push({
            filePath: currentPath,
            match,
          });
        });
      }
    } else {
      // Recursively check folder contents
      const folderResult = detectUserEnvInStructure(item.children, currentPath);
      locations.push(...folderResult.locations);
    }
  }

  return {
    hasUserEnv: locations.length > 0,
    locations,
  };
}
