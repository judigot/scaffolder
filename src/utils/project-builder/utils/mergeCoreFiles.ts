import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';

/**
 * Merges two package.json contents by combining dependencies.
 * Later (new) values override earlier (existing) for same packages.
 */
const mergePackageJson = (existingContent: string, newContent: string): string => {
  try {
    const existing = JSON.parse(existingContent);
    const incoming = JSON.parse(newContent);

    const merged = { ...existing };

    // Merge top-level fields (name, version, type, etc.)
    for (const key of Object.keys(incoming)) {
      if (key === 'dependencies' || key === 'devDependencies' || key === 'peerDependencies') {
        // Merge dependency objects
        merged[key] = {
          ...(existing[key] || {}),
          ...(incoming[key] || {}),
        };
      } else if (key === 'scripts') {
        // Merge scripts
        merged.scripts = {
          ...(existing.scripts || {}),
          ...(incoming.scripts || {}),
        };
      } else {
        // For other fields, incoming overwrites existing
        merged[key] = incoming[key];
      }
    }

    return JSON.stringify(merged, null, 2) + '\n';
  } catch {
    // If parsing fails, return the new content
    return newContent;
  }
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
        if (scaffoldedItem.name === 'package.json' && existingItem.type === 'file') {
          const mergedContent = mergePackageJson(existingItem.content, scaffoldedItem.content);
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
