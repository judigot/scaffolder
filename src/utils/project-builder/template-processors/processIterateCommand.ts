import { IFolder, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import {
  ITERATE_COMMAND_REGEX,
  ITERATE_TABLES_REGEX,
  TEMPLATE_MATCH_REGEX,
  SEPARATOR_MATCH_REGEX,
  FILTER_MATCH_REGEX,
  IGNORE_MATCH_REGEX,
  INCLUDE_FILES_MATCH_REGEX,
  EXCLUDE_FILES_MATCH_REGEX,
  REMOVE_DUPLICATES_REGEX,
  USE_CONSTANT_REGEX,
  FOLDER_PATH_REGEX,
} from '@/utils/project-builder/constants/templateActions.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { loadConstant } from '@/utils/project-builder/template-processors/loadConstant.ts';
import { processColumnsInfoIteration } from '@/utils/project-builder/template-processors/processColumnsInfoIteration.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { parse } from 'yaml';

export const processLoopTables = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
): string => {
  return content.replace(
    ITERATE_TABLES_REGEX,
    (_match: string, templateContent: string) => {
      return schemaInfo
        .map((table) => {
          const replacements = getReplacementsForTable(table, schemaInfoParsed);
          return replacePlaceholders(
            String(templateContent).trim(),
            replacements,
            userFiles,
            schemaInfoParsed,
            table,
          );
        })
        .join('\n    '); // Add proper indentation for PHP files
    },
  );
};

export const processIterateCommand = (
  command: string,
  table: ISchemaInfo | undefined,
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
): string => {
  // Extract the property path and options
  // Make the closing parenthesis optional and handle incomplete commands
  const match = ITERATE_COMMAND_REGEX.exec(command);
  if (!match || !table) {
    return '';
  }

  const [, propertyPathsStr, options = ''] = match;

  // Parse options
  const templateMatch = TEMPLATE_MATCH_REGEX.exec(options);
  const separatorMatch = SEPARATOR_MATCH_REGEX.exec(options);
  const removeDuplicates = REMOVE_DUPLICATES_REGEX.test(options);
  const ignoreMatch = IGNORE_MATCH_REGEX.exec(options);
  const filterMatch = FILTER_MATCH_REGEX.exec(options);
  const includedFilesMatch = INCLUDE_FILES_MATCH_REGEX.exec(options);
  const excludedFilesMatch = EXCLUDE_FILES_MATCH_REGEX.exec(options);

  // Process escape sequences in template
  const template = templateMatch
    ? templateMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\s/g, ' ')
    : '{{value}}';

  // Use literal separator string and preserve spaces
  const separator = separatorMatch
    ? separatorMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\s/g, ' ')
    : '';

  // Parse include and exclude filters
  const includedFiles = includedFilesMatch
    ? includedFilesMatch[1].split(',').map((item) => item.trim())
    : [];

  const excludedFiles = excludedFilesMatch
    ? excludedFilesMatch[1].split(',').map((item) => item.trim())
    : [];

  // Parse ignore list with flexible whitespace and handle USE_CONSTANT
  const ignoreList = ignoreMatch
    ? ignoreMatch[1]
        .split(',')
        .map((item) => {
          const trimmed = item.trim();
          const constantMatch = USE_CONSTANT_REGEX.exec(trimmed);
          if (constantMatch) {
            // Get raw values from constant file without any processing
            return loadConstant(
              constantMatch[1],
              userFiles,
              schemaInfoParsed,
              table,
            );
          }
          // For non-constant values, still process any placeholders they might have
          const replacements = getReplacementsForTable(table, schemaInfoParsed);
          return replacePlaceholders(
            trimmed,
            replacements,
            userFiles,
            schemaInfoParsed,
            table,
          );
        })
        .flat()
    : [];

  // Parse filter list with flexible whitespace and handle USE_CONSTANT
  const filterList = filterMatch
    ? filterMatch[1].split(',').map((item) => {
        const trimmed = item.trim();
        const constantMatch = USE_CONSTANT_REGEX.exec(trimmed);
        if (constantMatch) {
          // Get raw values from constant file and return as an array
          return loadConstant(
            constantMatch[1],
            userFiles,
            schemaInfoParsed,
            table,
          );
        }
        // For non-constant values, still process any placeholders they might have
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        return replacePlaceholders(
          trimmed,
          replacements,
          userFiles,
          schemaInfoParsed,
          table,
        );
      })
    : [];

  // Helper function to join array with separator between elements
  const joinWithSeparator = (arr: string[]): string => {
    if (arr.length === 0) {
      return '';
    }
    if (arr.length === 1) {
      return arr[0];
    }
    return arr.slice(0, -1).join(separator) + separator + arr.slice(-1)[0];
  };

  // Helper function to filter ignored values
  const filterIgnored = (values: string[]): string[] => {
    if (ignoreList.length === 0) {
      return values;
    }
    return values.filter((value) => !ignoreList.includes(value));
  };

  // Helper function to apply filter
  const applyFilter = (values: string[]): string[] => {
    if (filterList.length === 0) {
      return values;
    }

    // Flatten the filter list to handle both direct values and arrays from USE_CONSTANT
    const flattenedFilterList = filterList.reduce<string[]>(
      (acc, filterPattern) => {
        if (Array.isArray(filterPattern)) {
          return [...acc, ...filterPattern];
        }
        return [...acc, filterPattern];
      },
      [],
    );

    return values.filter((value) => flattenedFilterList.includes(value));
  };

  // Special handling for ITERATE(tables) command
  if (propertyPathsStr.trim() === 'tables') {
    // This is where we integrate processLoopTables functionality
    // It doesn't actually use the current table, but rather processes all tables
    // The tables need to be provided via a parameter
    return ''; // This is a placeholder, will be handled by the external processLoopTables function
  }

  // Split property paths and clean whitespace
  const propertyPaths = propertyPathsStr.split(',').map((p) => {
    let path = p.trim();
    // If it's a function call with missing closing parenthesis, add it
    if (path.startsWith('{{') && path.includes('(') && !path.includes(')')) {
      path = `${path})}}`;
    }
    // If it's a function call with missing closing brace, add it
    if (path.startsWith('{{') && !path.endsWith('}}')) {
      path = `${path}}}`;
    }
    return path;
  });

  // Special handling for columnsInfo iteration
  if (propertyPaths.includes('columnsInfo')) {
    return processColumnsInfoIteration(
      table,
      template,
      separator,
      schemaInfoParsed,
      userFiles,
    );
  }

  // For other types of iterations, use the original logic
  // Collect all values from all properties
  const allValues: string[] = [];

  // Special handling for user folder paths (starting with /)
  // Create a map to store all placeholder values for each method/value
  const allPlaceholderValues = new Map<string, Record<string, string>>();

  // Track filenames separately to apply include/exclude filters
  const fileNameMap = new Map<string, string>();

  for (const path of propertyPaths) {
    const folderMatch = FOLDER_PATH_REGEX.exec(path);
    if (folderMatch) {
      const [, folderPath] = folderMatch;
      // Navigate through the folder structure
      const pathParts = folderPath.split('/').filter(Boolean);
      let currentFolder: IFolder | undefined;

      // Start from root
      const store = userFiles;

      // Find the target folder
      if (pathParts.length > 0) {
        // Find the first level folder
        currentFolder = store.find(
          (item): item is IFolder =>
            item.type === 'folder' && item.name === pathParts[0],
        );

        // Navigate through the rest of the path
        for (let i = 1; i < pathParts.length && currentFolder; i++) {
          currentFolder = currentFolder.children.find(
            (item): item is IFolder =>
              item.type === 'folder' && item.name === pathParts[i],
          );
        }
      }

      if (currentFolder) {
        // Process all files in the folder
        currentFolder.children.forEach((item) => {
          if (item.type === 'file') {
            const fileName = item.name;
            const fileBaseName = fileName.replace(/\.[^.]+$/, '');

            // Apply include/exclude filters based on the filename
            const shouldInclude =
              includedFiles.length === 0 ||
              includedFiles.some((pattern) => fileName.includes(pattern));

            const shouldExclude =
              excludedFiles.length > 0 &&
              excludedFiles.some((pattern) => fileName.includes(pattern));

            // Skip this file if it doesn't meet the include/exclude criteria
            if (!shouldInclude || shouldExclude) {
              return;
            }

            // For YAML files, try to extract structured data
            if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
              // Safely try to parse YAML content
              const content = item.content;
              const parsedContent: unknown = parse(content);

              // Process YAML content if it's a valid object
              if (
                parsedContent !== null &&
                typeof parsedContent === 'object' &&
                !Array.isArray(parsedContent)
              ) {
                const extractedValues: Record<string, string> = {};
                const recordContent = parsedContent;

                // Process all properties in the object
                Object.entries(recordContent).forEach(([key, value]) => {
                  if (typeof value === 'string') {
                    extractedValues[key] = value;
                  } else if (
                    typeof value === 'number' ||
                    typeof value === 'boolean'
                  ) {
                    extractedValues[key] = String(value);
                  } else if (Array.isArray(value)) {
                    extractedValues[key] = value
                      .map((item) => String(item))
                      .join(',');
                  }
                });

                if (Object.keys(extractedValues).length > 0) {
                  // If we have at least one valid property, ensure 'value' is set
                  if (!('value' in extractedValues)) {
                    extractedValues.value = fileBaseName;
                  }

                  // Determine primary value to use for the iteration
                  let primaryValue = extractedValues.value || fileBaseName;

                  // Try common identifier properties first
                  const identifiers = ['id', 'name', 'key', 'identifier'];
                  for (const id of identifiers) {
                    if (id in extractedValues) {
                      primaryValue = extractedValues[id];
                      break;
                    }
                  }

                  allValues.push(primaryValue);
                  allPlaceholderValues.set(primaryValue, extractedValues);
                  fileNameMap.set(primaryValue, fileName);
                  return; // Skip to next file
                }
              }
            }

            // Fallback for non-YAML files or if YAML processing failed
            allValues.push(fileBaseName);
            allPlaceholderValues.set(fileBaseName, { value: fileBaseName });
            fileNameMap.set(fileBaseName, fileName);
          }
        });
      }
    }
  }

  for (const propertyPath of propertyPaths) {
    // Check if the entire propertyPath is a function call
    if (propertyPath.startsWith('{{') && propertyPath.endsWith('}}')) {
      const functionCall = propertyPath.slice(2, -2).trim();
      // Extract just the function name without any parentheses
      const functionName = functionCall.replace(/\([^)]*\)?$/, '');

      switch (functionName) {
        case 'getAllColumns': {
          const values = schemaInfoParsed.getAllColumns(table.tableName);
          allValues.push(...values);
          continue;
        }
        case 'getRequiredColumns': {
          const values = schemaInfoParsed.getRequiredColumns(table.tableName);
          allValues.push(...values);
          continue;
        }
        case 'getPrimaryKey': {
          const value = schemaInfoParsed.getPrimaryKey(table.tableName);
          if (value) {
            allValues.push(value);
          }
          continue;
        }
      }
      continue; // Skip unknown function calls
    }

    // Handle direct property access
    const cleanPath = propertyPath.replace(/[{}]/g, '').trim();

    switch (cleanPath) {
      case 'hasMany': {
        const values = table.hasMany ?? [];
        allValues.push(...values);
        break;
      }
      case 'belongsToMany': {
        const values = table.belongsToMany ?? [];
        allValues.push(...values);
        break;
      }
      case 'hasOne': {
        const values = table.hasOne ?? [];
        allValues.push(...values);
        break;
      }
      case 'belongsTo': {
        const values = table.belongsTo ?? [];
        allValues.push(...values);
        break;
      }
      case 'requiredColumns': {
        const values = table.requiredColumns ?? [];
        allValues.push(...values);
        break;
      }
      case 'pivotRelationships.relatedTable': {
        const pivotTables =
          table.pivotRelationships?.map((rel) => rel.relatedTable) ?? [];
        allValues.push(...pivotTables);
        break;
      }
      case 'columnsInfo': {
        // Handle columnsInfo specially to extract column_name values
        const columnNames = table.columnsInfo.map((col) => col.column_name);
        allValues.push(...columnNames);
        break;
      }
    }
  }

  // Remove duplicates if requested, apply filter, and filter ignored values
  let finalValues = removeDuplicates ? [...new Set(allValues)] : allValues;
  finalValues = applyFilter(finalValues);
  finalValues = filterIgnored(finalValues);

  // Map values through template and join with proper replacements
  const lines = finalValues.map((value) => {
    // Get all case variations of the value using changeCase
    const caseFormats = changeCase(value);

    // Add all case variations and the raw value to replacements
    const replacements: Record<string, string | string[]> = {
      value, // Raw value without case transformation
      valuePlural: caseFormats.plural,
      valueSingular: caseFormats.singular,
      valueTitleCase: caseFormats.titleCase,
      valueSentenceCase: caseFormats.sentenceCase,
      valuePhraseCase: caseFormats.phraseCase,
      valuePascalCase: caseFormats.pascalCase,
      valueCamelCase: caseFormats.camelCase,
      valueKebabCase: caseFormats.kebabCase,
      valueSnakeCase: caseFormats.snakeCase,
      valueTitleCasePlural: caseFormats.titleCasePlural,
      valueSentenceCasePlural: caseFormats.sentenceCasePlural,
      valuePhraseCasePlural: caseFormats.phraseCasePlural,
      valuePascalCasePlural: caseFormats.pascalCasePlural,
      valueCamelCasePlural: caseFormats.camelCasePlural,
      valueKebabCasePlural: caseFormats.kebabCasePlural,
      valueSnakeCasePlural: caseFormats.snakeCasePlural,
      valueTitleCaseSingular: caseFormats.titleCaseSingular,
      valueSentenceCaseSingular: caseFormats.sentenceCaseSingular,
      valuePhraseCaseSingular: caseFormats.phraseCaseSingular,
      valuePascalCaseSingular: caseFormats.pascalCaseSingular,
      valueCamelCaseSingular: caseFormats.camelCaseSingular,
      valueKebabCaseSingular: caseFormats.kebabCaseSingular,
      valueSnakeCaseSingular: caseFormats.snakeCaseSingular,
      // Add table replacements for other placeholders that might be in the template
      ...getReplacementsForTable(table, schemaInfoParsed),
    };

    // Add all placeholders found in the YAML file for this value
    const placeholders = allPlaceholderValues.get(value);
    if (placeholders !== undefined) {
      Object.entries(placeholders).forEach(([key, val]) => {
        replacements[key] = val;
      });
    }

    return replacePlaceholders(
      template,
      replacements,
      userFiles,
      schemaInfoParsed,
      table,
    );
  });

  return joinWithSeparator(lines);
};
