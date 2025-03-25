import { ICommandOptions } from "@/utils/project-builder/interfaces/interfaces.ts";

export const parseCommand = (
  command: string,
): { command: string; options: ICommandOptions } => {
  const parts = command.split('--');
  const mainCommand = parts[0].trim().replace(/[()]/g, '');
  const options: ICommandOptions = {};

  parts.slice(1).forEach((part) => {
    const [key, ...valueParts] = part.trim().split(' ');
    const value = valueParts.join(' ');

    if (key === 'conditions' && value) {
      const trimmedValue = value.trim();
      if (trimmedValue.length === 0) {
        return;
      }
      if (trimmedValue.startsWith('[')) {
        options.conditions = trimmedValue
          .slice(1, -1)
          .split(',')
          .map((condition) => condition.trim())
          .filter((condition): condition is string => condition.length > 0);
      } else {
        options.conditions = [trimmedValue];
      }
    } else if (key === 'template' && value) {
      const trimmedTemplate = value.trim();
      if (trimmedTemplate.length > 0) {
        options.template = trimmedTemplate;
      }
    } else if (key === 'related-files' && value && value.trim().length > 0) {
      // Parse the related files array (e.g., [ CREATE_FILE(...), CREATE_FILE(...) ])
      const trimmedValue = value.trim();
      if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
        // Extract the array content and split by commas that are not inside parentheses
        const relatedFilesContent = trimmedValue.slice(1, -1).trim();

        // Use regex to split by commas not inside parentheses
        const splitRelatedFiles = relatedFilesContent.split(/,(?![^(]*\))/);

        options.relatedFiles = splitRelatedFiles
          .map((cmd) => cmd.trim())
          .filter((cmd) => cmd.length > 0);
      } else {
        console.warn(
          `Invalid related-files format: ${value}. Expected format: [ CREATE_FILE(...), ... ]`,
        );
      }
    } else if (key === 'use-related-table') {
      // Boolean flag without value
      options.useRelatedTable = true;
    } else if (key === 'include-table' && value) {
      // Extract table name from quotes if present
      const tableNameMatch = /^"([^"]+)"$|^'([^']+)'$/.exec(value.trim());
      if (tableNameMatch) {
        options.includeTable = tableNameMatch[1] || tableNameMatch[2];
      } else {
        options.includeTable = value.trim();
      }
    } else if (key === 'exclude-table' && value) {
      // Extract table name from quotes if present
      const tableNameMatch = /^"([^"]+)"$|^'([^']+)'$/.exec(value.trim());
      if (tableNameMatch) {
        options.excludeTable = tableNameMatch[1] || tableNameMatch[2];
      } else {
        options.excludeTable = value.trim();
      }
    }
  });

  return { command: mainCommand, options };
};
