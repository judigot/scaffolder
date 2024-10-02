export const toPascalCase = (str: string): string => {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

export const snakeToCamelCase = (input: string): string => {
  return input
    .split('_') // Split the string by underscores
    .map((word, index) => {
      // Capitalize the first letter of each word except the first one
      if (index === 0) {
        return word; // First word remains lowercase
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(''); // Join the words back together
};

export const convertToUrlFormat = (str: string): string => {
  return str.replace(/_/g, '-');
};

export const normalizeWhitespace = (str: string) =>
  str.replace(/\s+/g, ' ').trim();
