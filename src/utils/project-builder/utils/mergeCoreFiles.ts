import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';

/** Type for package.json structure */
interface IPackageJson {
  name?: string;
  version?: string;
  type?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Type guard to validate if a value is a package.json object.
 * Since IPackageJson has an index signature [key: string]: unknown,
 * any non-null object is structurally compatible.
 */
function isIPackageJson(value: unknown): value is IPackageJson {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Safely parses JSON and returns a typed object or null on failure
 */
function parsePackageJson(content: string): IPackageJson | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (isIPackageJson(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Merges two package.json contents by combining dependencies.
 * Later (new) values override earlier (existing) for same packages.
 */
const mergePackageJson = (
  existingContent: string,
  newContent: string,
): string => {
  const existing = parsePackageJson(existingContent);
  const incoming = parsePackageJson(newContent);

  if (existing === null || incoming === null) {
    // If parsing fails, return the new content
    return newContent;
  }

  const merged: IPackageJson = { ...existing };

  // Merge top-level fields (name, version, type, etc.)
  for (const key of Object.keys(incoming)) {
    if (
      key === 'dependencies' ||
      key === 'devDependencies' ||
      key === 'peerDependencies'
    ) {
      // Merge dependency objects
      const existingDeps = existing[key] ?? {};
      const incomingDeps = incoming[key] ?? {};
      merged[key] = {
        ...existingDeps,
        ...incomingDeps,
      };
    } else if (key === 'scripts') {
      // Merge scripts
      merged.scripts = {
        ...existing.scripts,
        ...incoming.scripts,
      };
    } else {
      // For other fields, incoming overwrites existing
      merged[key] = incoming[key];
    }
  }

  return `${JSON.stringify(merged, null, 2)}\n`;
};

/**
 * Merges core files with scaffolded files using smart conflict resolution:
 *
 * - Files with different names: Both included
 * - Files with same name: Scaffolded overrides core (except package.json which merges)
 * - Folders with same name: Contents merged recursively
 * - Works dynamically at any nesting depth
 *
 * Special handling:
 * - package.json: Dependencies and scripts are merged, not replaced
 *
 * @param coreFiles - Essential files from the core folder
 * @param scaffoldedFiles - Generated files from structure.yaml
 * @returns Merged file structure with proper conflict resolution
 */
export const mergeCoreFilesWithScaffolded = (
  coreFiles: IStructure,
  scaffoldedFiles: IStructure,
): IStructure => {
  const merged: IStructure = [...coreFiles];

  for (const scaffoldedItem of scaffoldedFiles) {
    const existingIndex = merged.findIndex(
      (item) =>
        item.name === scaffoldedItem.name && item.type === scaffoldedItem.type,
    );

    if (existingIndex === -1) {
      merged.push(scaffoldedItem);
    } else {
      const existingItem = merged[existingIndex];

      if (scaffoldedItem.type === 'folder' && existingItem.type === 'folder') {
        const mergedFolder: IFolder = {
          type: 'folder',
          name: existingItem.name,
          children: mergeCoreFilesWithScaffolded(
            existingItem.children,
            scaffoldedItem.children,
          ),
        };
        merged[existingIndex] = mergedFolder;
      } else if (scaffoldedItem.type === 'file') {
        // Special handling for package.json - merge dependencies
        if (
          scaffoldedItem.name === 'package.json' &&
          existingItem.type === 'file'
        ) {
          const mergedContent = mergePackageJson(
            existingItem.content,
            scaffoldedItem.content,
          );
          const mergedFile: IFile = {
            type: 'file',
            name: 'package.json',
            content: mergedContent,
          };
          merged[existingIndex] = mergedFile;
        } else {
          merged[existingIndex] = scaffoldedItem;
        }
      }
    }
  }

  return merged;
};
