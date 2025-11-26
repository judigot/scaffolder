export function mergeArrayOfObjects(structure1, structure2, groupBy) {
  /**
   * Determines if two objects are similar based on the `groupBy` key.
   */
  function areObjectsSimilar(obj1, obj2) {
    return obj1[groupBy] === obj2[groupBy];
  }
  /**
   * Merges two objects deeply, handling `files` arrays specifically for `IFolder`.
   */
  function mergeObjects(target, source) {
    if (target.type === 'folder' && source.type === 'folder') {
      // Merge files array recursively for folders
      target.children = mergeArrayOfObjects(
        target.children,
        source.children,
        groupBy,
      );
    } else if (target.type === 'file' && source.type === 'file') {
      // For files, source overwrites target
      target.content = source.content;
    }
    return target;
  }
  const mergedArray = [];
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
