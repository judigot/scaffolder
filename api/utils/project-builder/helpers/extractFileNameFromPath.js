export const extractFileNameFromPath = (path) => {
  const pathComponents = path.split('/');
  return pathComponents[pathComponents.length - 1];
};
