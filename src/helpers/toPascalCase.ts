export const toPascalCase = (str: string): string => {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

export const convertToUrlFormat = (str: string): string => {
  return str.replace(/_/g, '-');
};

export const normalizeWhitespace = (str: string) =>
  str.replace(/\s+/g, ' ').trim();
