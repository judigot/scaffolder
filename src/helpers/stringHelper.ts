export const convertToUrlFormat = (str: string): string => {
  return str.replace(/_/g, '-');
};

export const normalizeWhitespace = (str: string) =>
  str.replace(/\s+/g, ' ').trim();

export const handleCopy = (text: string) => {
  navigator.clipboard.writeText(text).catch((err: unknown) => {
    console.error('Failed to copy text: ', err);
  });
};
