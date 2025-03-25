export const extractFileNameFromPath = (path: string): string => {
  const pathComponents = path.split('/');
  return pathComponents[pathComponents.length - 1];
};
