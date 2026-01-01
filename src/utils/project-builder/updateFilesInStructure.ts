import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';

/**
 * Updates multiple files in a structure in a single pass.
 * More efficient than calling updateFileInStructure multiple times.
 *
 * @param structure - The file structure to update
 * @param updates - Map of file paths to new content (path -> content)
 * @returns New structure with updated files (immutable)
 */
export function updateFilesInStructure(
  structure: IStructure,
  updates: Map<string, string>,
): IStructure {
  if (updates.size === 0) {
    // Return a shallow copy to maintain immutability
    return [...structure];
  }

  const updateFile = (items: IStructure, basePath = ''): IStructure => {
    return items.map((item) => {
      const currentPath =
        basePath === '' ? item.name : `${basePath}/${item.name}`;

      if (item.type === 'file') {
        // Check if this file needs updating
        if (updates.has(currentPath)) {
          const updatedFile: IFile = {
            ...item,
            content: updates.get(currentPath) ?? item.content,
          };
          return updatedFile;
        }
        // Return a shallow copy to maintain immutability
        return { ...item };
      } else {
        // Recursively update folder children
        const updatedFolder: IFolder = {
          ...item,
          children: updateFile(item.children, currentPath),
        };
        return updatedFolder;
      }
    });
  };

  return updateFile(structure);
}
