/**
 * @deprecated {% IF %} syntax has been removed. Use <@@IF@@> instead.
 * This function is now a no-op for backwards compatibility.
 */
export const processIfConditions = (
  content: string,
  _replacements: Record<string, string | string[]>,
): string => {
  return content;
};
