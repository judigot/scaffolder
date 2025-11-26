import { getReplacementsForTable } from '../../../utils/project-builder/template-processors/getReplacementsForTable';
import { replacePlaceholders } from '../../../utils/project-builder/utils/replacePlaceholders';
import { parse } from 'yaml';
export const loadConstant = (
  constantName,
  userFiles,
  schemaInfoParsed,
  table,
  projectFilePath,
  formData,
  userMetadata,
) => {
  const store = userFiles;
  const constantsFolder = store.find(
    (item) => item.type === 'folder' && item.name === 'Constants',
  );
  if (!constantsFolder) {
    return [];
  }
  const constantFile = constantsFolder.children.find(
    (item) => item.type === 'file' && item.name === `${constantName}.yaml`,
  );
  if (!constantFile) {
    return [];
  }
  try {
    // Preprocess content to quote values with curly braces to ensure they're parsed as strings
    const preprocessedContent = constantFile.content.replace(
      /^-\s*(\{\{[^}]+\}\})\s*$/gm,
      '- "$1"',
    );
    // Parse YAML content
    const parsed = parse(preprocessedContent);
    // Type guard for Record<string, unknown>
    function isRecord(value) {
      return value !== null && typeof value === 'object';
    }
    // First get raw values without processing placeholders
    let rawValues = [];
    // Handle both formats:
    // Format 1: Array of values
    if (Array.isArray(parsed)) {
      rawValues = parsed.map((item) => String(item).trim());
    }
    // Format 2: Named constant object
    else if (isRecord(parsed)) {
      if (constantName in parsed && Array.isArray(parsed[constantName])) {
        const values = parsed[constantName];
        if (Array.isArray(values)) {
          rawValues = values.map((item) => String(item).trim());
        }
      }
    }
    // Then process placeholders if table is provided
    if (table) {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);
      return rawValues.map((value) =>
        replacePlaceholders(
          value,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
          projectFilePath,
          constantName,
          formData,
          userMetadata,
        ),
      );
    }
    return rawValues;
  } catch {
    return [];
  }
};
