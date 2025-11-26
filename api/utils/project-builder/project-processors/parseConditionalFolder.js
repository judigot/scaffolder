export const parseConditionalFolder = (folderName) => {
  const match = /^(.+?)\(--condition\s+(.+?)\)$/.exec(folderName);
  if (!match) {
    return { name: folderName };
  }
  const [, name, condition] = match;
  return {
    name: name.trim(),
    conditions: [condition.trim()],
  };
};
