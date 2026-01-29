export const parseConditionalFolder = (
  folderName: string,
): { name: string; conditions?: string[] } => {
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
