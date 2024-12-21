import { IStructure, IBase, IFile, IFolder } from "@/components/FileViewer.tsx";

export function mergeArrayOfObjects(
  structure1: IStructure,
  structure2: IStructure,
  groupBy: keyof IBase,
): IStructure {
  /**
   * Determines if two objects are similar based on the `groupBy` key.
   */
  function areObjectsSimilar(obj1: IBase, obj2: IBase): boolean {
    return obj1[groupBy] === obj2[groupBy];
  }

  /**
   * Merges two objects deeply, handling `files` arrays specifically for `IFolder`.
   */
  function mergeObjects(
    target: IFile | IFolder,
    source: IFile | IFolder,
  ): IFile | IFolder {
    if (target.type === 'folder' && source.type === 'folder') {
      // Merge files array recursively for folders
      target.files = mergeArrayOfObjects(target.files, source.files, groupBy);
    } else if (target.type === 'file' && source.type === 'file') {
      // For files, source overwrites target
      target.content = source.content;
    }
    return target;
  }

  const mergedArray: IStructure = [];

  for (const item of [...structure1, ...structure2]) {
    const existingItemIndex = mergedArray.findIndex((existing) =>
      areObjectsSimilar(existing, item),
    );

    if (existingItemIndex !== -1) {
      // Merge similar objects
      mergedArray[existingItemIndex] = mergeObjects(
        mergedArray[existingItemIndex],
        item,
      );
    } else {
      // Add new object
      mergedArray.push({ ...item });
    }
  }

  return mergedArray;
}
