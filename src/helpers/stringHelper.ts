export const convertToUrlFormat = (str: string): string => {
  return str.replace(/_/g, '-');
};

export const normalizeWhitespace = (str: string) =>
  str.replace(/\s+/g, ' ').trim();
