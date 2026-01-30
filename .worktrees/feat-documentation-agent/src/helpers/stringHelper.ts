export const normalizeWhitespace = (str: string) =>
  str.replace(/\s+/g, ' ').trim();

export const handleCopy = (text: string) => {
  navigator.clipboard.writeText(text).catch((err: unknown) => {
    console.error('Failed to copy text: ', err);
  });
};

export const createFile = ({
  template,
  replacements,
}: {
  template: string;
  replacements: Record<string, string>;
}): string => {
  return replacePlaceholder({ template, replacements })
    .split('\n')
    .slice(1)
    .join('\n');
};

export const replacePlaceholder = ({
  template,
  replacements,
}: {
  template: string;
  replacements: Record<string, string>;
}): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );
