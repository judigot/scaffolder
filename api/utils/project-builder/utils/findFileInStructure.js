export const findFileInStructure = (path, structure) => {
  // Remove leading slash if present
  const normPath = path.startsWith('/') ? path.substring(1) : path;
  // Split the path into components
  const pathComponents = normPath.split('/');
  const fileName = pathComponents.pop() ?? '';
  // Navigate through the directory structure
  let currentItems = structure;
  for (const component of pathComponents) {
    const folder = currentItems.find(
      (item) => item.type === 'folder' && item.name === component,
    );
    if (!folder) {
      return undefined;
    }
    currentItems = folder.children;
  }
  // Find the file in the final directory
  return currentItems.find(
    (item) => item.type === 'file' && item.name === fileName,
  );
};
