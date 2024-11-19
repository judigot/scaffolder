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

export const createFile = (
  template: string,
  replacements: Record<string, string>,
): string => {
  return replacePlaceholder(template, replacements);
};

export const replacePlaceholder = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );
