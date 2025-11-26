/**
 * Check if a folder contains any YAML files
 */
export const folderContainsYamlFiles = (folder) => {
  return folder.children.some(
    (item) =>
      item.type === 'file' &&
      (item.name.endsWith('.yml') || item.name.endsWith('.yaml')),
  );
};
/**
 * Find a folder in the file structure given a path
 */
export const findFolderByPath = (path, userFiles) => {
  const pathParts = path.split('/').filter(Boolean);
  let currentFolder;
  // Start from root
  const store = userFiles;
  // If no path parts, return undefined as we're at root level
  if (pathParts.length === 0) {
    return undefined;
  }
  // Find the first level folder
  currentFolder = store.find(
    (item) => item.type === 'folder' && item.name === pathParts[0],
  );
  // Navigate through the rest of the path
  for (let i = 1; i < pathParts.length && currentFolder; i++) {
    currentFolder = currentFolder.children.find(
      (item) => item.type === 'folder' && item.name === pathParts[i],
    );
  }
  return currentFolder;
};
