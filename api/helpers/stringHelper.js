export const normalizeWhitespace = (str) => str.replace(/\s+/g, ' ').trim();
export const handleCopy = (text) => {
  navigator.clipboard.writeText(text).catch((err) => {
    console.error('Failed to copy text: ', err);
  });
};
export const createFile = ({ template, replacements }) => {
  return replacePlaceholder({ template, replacements })
    .split('\n')
    .slice(1)
    .join('\n');
};
export const replacePlaceholder = ({ template, replacements }) =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );
