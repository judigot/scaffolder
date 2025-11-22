import type { IStructure, IFolder } from '@/components/FileViewer.tsx';

/**
 * Merges core files with scaffolded files using smart conflict resolution:
 *
 * - Files with different names: Both included
 * - Files with same name: Scaffolded overrides core
 * - Folders with same name: Contents merged recursively
 * - Works dynamically at any nesting depth
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
        merged[existingIndex] = scaffoldedItem;
      }
    }
  }

  return merged;
};
