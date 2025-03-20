import { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import config from '@/config/config.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';

// Configuration for folder names that can be changed in one place
const folderConfig = {
  methodsFolder: 'BaseMethods',
  methodGroupFile: 'base-methods-group.yaml',
  methodGroupFileAlt: 'base-method-group.yaml',
};

const schemaInfo = getSchemaInfo(masterSchema);

export const buildProjectFiles = (
  yamlContent: string,
  userFiles: IStructure,
): IStructure => {
  interface ICommandOptions {
    conditions?: string[];
    template?: string;
    modelSpecificRoutes?: string;
    baseRoutesForController?: string;
  }

  type IYamlObject = Record<string, unknown>;

  const _isYamlObject = (value: unknown): value is IYamlObject => {
    return value !== null && typeof value === 'object';
  };

  const loadTemplateContent = (templateName: string): string => {
    const store = userFiles;
    const templatesFolder = store.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === 'Templates',
    );

    if (!templatesFolder) {
      console.warn(
        `Templates folder not found when trying to load template: ${templateName}`,
      );
      return '';
    }

    const templateFile = templatesFolder.children.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === templateName,
    );

    if (!templateFile) {
      console.warn(`Template file not found: ${templateName}`);
      return '';
    }

    function replaceOutsideTemplateSeparator(input: string): string {
      const placeholders: string[] = [];
      let index = 0;

      const pattern = /(--template="[^"]*"|--separator="[^"]*")/g;

      // 1) Temporarily replace those segments with placeholders
      let protectedString = input.replace(pattern, (match: string) => {
        placeholders.push(match);
        const placeholder = `__PLACEHOLDER_${String(index)}__`; // <-- Avoid numeric template literal
        index += 1;
        return placeholder;
      });

      // 2) Replace all remaining \n (i.e., \\n) with real newlines outside placeholders
      protectedString = protectedString.replace(/\\n/g, '\n');

      // 3) Restore protected segments so that \\n in them remains intact
      protectedString = protectedString.replace(
        /__PLACEHOLDER_(\d+)__/g,
        (_: string, p1: string) => {
          const i = parseInt(p1, 10);
          return placeholders[i] ?? '';
        },
      );

      return protectedString;
    }

    return replaceOutsideTemplateSeparator(
      templateFile.content
        .replace(/\r\n/g, '\n') // Normalize line endings first
        .replace(/\n/g, '\\n'),
    );

    // return templateFile.content;
  };

  // Update the type to handle string arrays
  type ReplacementValue = string | string[];
  type Replacements = Record<string, ReplacementValue>;

  const getReplacementsForTable = (table: ISchemaInfo): Replacements => {
    const tableName = table.tableName;
    const caseFormats = changeCase(tableName);

    return {
      tableNamePascalCase: caseFormats.pascalCase,
      tableNamePascalCaseSingular: caseFormats.pascalCaseSingular,
      tableNameKebabCasePlural: caseFormats.kebabCasePlural,
      tableNamePlural: caseFormats.plural,
      tableNameSnakeCaseSingular: caseFormats.snakeCaseSingular,
      tableName,
      tableNameSingular: caseFormats.singular,
      tableNameTitleCase: caseFormats.titleCase,
      tableNameSentenceCase: caseFormats.sentenceCase,
      tableNamePhraseCase: caseFormats.phraseCase,
      tableNameCamelCase: caseFormats.camelCase,
      tableNameKebabCase: caseFormats.kebabCase,
      tableNameSnakeCase: caseFormats.snakeCase,
      tableNameTitleCasePlural: caseFormats.titleCasePlural,
      tableNameSentenceCasePlural: caseFormats.sentenceCasePlural,
      tableNamePhraseCasePlural: caseFormats.phraseCasePlural,
      tableNamePascalCasePlural: caseFormats.pascalCasePlural,
      tableNameCamelCasePlural: caseFormats.camelCasePlural,
      tableNameTitleCaseSingular: caseFormats.titleCaseSingular,
      tableNameSentenceCaseSingular: caseFormats.sentenceCaseSingular,
      tableNamePhraseCaseSingular: caseFormats.phraseCaseSingular,
      tableNameCamelCaseSingular: caseFormats.camelCaseSingular,
      tableNameKebabCaseSingular: caseFormats.kebabCaseSingular,
      // Add primary key and required columns with matching template syntax
      'getPrimaryKey()': schemaInfo.getPrimaryKey(table.tableName),
      'getRequiredColumns()': schemaInfo.getRequiredColumns(table.tableName),
      'getAllColumns()': schemaInfo.getAllColumns(table.tableName),
    };
  };

  const checkConditions = (conditions: string[]): boolean => {
    return conditions.every((condition) => {
      const [key, value] = condition.split('=');
      if (key === 'hasUsers') {
        return String(config.users.hasUsers) === value;
      }
      if (key === 'isMultiTenancyEnabled') {
        return String(config.users.isMultiTenancyEnabled) === value;
      }
      return false;
    });
  };

  const parseCommand = (
    command: string,
  ): { command: string; options: ICommandOptions } => {
    const parts = command.split('--');
    const mainCommand = parts[0].trim().replace(/[()]/g, '');
    const options: ICommandOptions = {};

    parts.slice(1).forEach((part) => {
      const [key, value] = part.trim().split(' ');
      if (key === 'conditions' && typeof value === 'string') {
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
      } else if (key === 'template' && typeof value === 'string') {
        const trimmedTemplate = value.trim();
        if (trimmedTemplate.length > 0) {
          options.template = trimmedTemplate;
        }
      }
    });

    return { command: mainCommand, options };
  };

  const parseConditionalFolder = (
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

  const processLoopTables = (content: string): string => {
    // Handle base methods controller loop
    const baseMethodsRegex = /\[\[LOOP_BASE_METHODS\s+([^\]]+)\]\]/g;
    content = content.replace(
      baseMethodsRegex,
      (_match: string, loopContent: string) => {
        const store = userFiles;
        const baseMethodsFolder = store.find(
          (item): item is IFolder =>
            item.type === 'folder' && item.name === folderConfig.methodsFolder,
        );

        if (!baseMethodsFolder) {
          console.warn(`${folderConfig.methodsFolder} folder not found`);
          return '';
        }

        // Load the base-methods-group.yaml to get the groups
        const groupFile = store.find(
          (item): item is IFile =>
            item.type === 'file' &&
            (item.name === folderConfig.methodGroupFile ||
              item.name === folderConfig.methodGroupFileAlt),
        );

        interface IMethodGroup {
          methods: string[];
        }

        type IMethodGroups = Record<string, IMethodGroup>;

        const isRecord = (value: unknown): value is Record<string, unknown> => {
          return typeof value === 'object' && value !== null;
        };

        const isMethodGroups = (value: unknown): value is IMethodGroups => {
          if (!isRecord(value)) {
            return false;
          }
          return Object.values(value).every(
            (group) =>
              isRecord(group) &&
              Array.isArray(group.methods) &&
              group.methods.every((method) => typeof method === 'string'),
          );
        };

        // Parse the groups file
        const parsedGroups: unknown = groupFile ? parse(groupFile.content) : {};
        const groups: IMethodGroups = isMethodGroups(parsedGroups)
          ? parsedGroups
          : {};

        // Create a map of method name to its content
        const methodsMap = new Map<string, string>();
        baseMethodsFolder.children
          .filter((item): item is IFile => item.type === 'file')
          .forEach((file) => {
            try {
              const yamlContent: unknown = parse(file.content);
              if (isRecord(yamlContent)) {
                // Extract all properties from YAML to create dynamic replacements
                // All properties become available as placeholders in templates
                const replacements: Record<string, string> = {};

                // Process all properties recursively to handle nested objects
                const processObject = (
                  obj: Record<string, unknown>,
                  prefix = '',
                  result: Record<string, string> = {},
                ): Record<string, string> => {
                  Object.entries(obj).forEach(([key, value]) => {
                    const fullKey = prefix ? `${prefix}.${key}` : key;

                    if (typeof value === 'string') {
                      result[fullKey] = value;
                    } else if (
                      typeof value === 'number' ||
                      typeof value === 'boolean'
                    ) {
                      result[fullKey] = String(value);
                    } else if (
                      value !== null &&
                      typeof value === 'object' &&
                      !Array.isArray(value)
                    ) {
                      // Handle nested objects recursively - use type guard instead of type assertion
                      if (isRecord(value)) {
                        processObject(value, fullKey, result);
                      }
                    } else if (Array.isArray(value)) {
                      // Handle arrays by joining with commas
                      result[fullKey] = value
                        .map((item) => String(item))
                        .join(',');
                    }
                  });

                  return result;
                };

                // Use the isRecord type guard instead of type assertion
                if (isRecord(yamlContent)) {
                  processObject(yamlContent, '', replacements);
                }

                // Make sure value is always set for templates that use {{value}} if not already present
                if (!('value' in replacements)) {
                  replacements.value = file.name.replace(/\.[^.]+$/, '');
                }

                // Use first property's value as primary key or filename as fallback
                let primaryValue = file.name.replace(/\.[^.]+$/, '');
                if (Object.keys(replacements).length > 0) {
                  primaryValue = Object.values(replacements)[0];
                }

                // Process the YAML content with all available properties
                let methodContent: string;

                if (
                  loopContent.includes('{{repositoryMethod}}') &&
                  'repositoryMethod' in replacements
                ) {
                  // For interface, process the template with all properties
                  const processedMethod = replacePlaceholders(
                    replacements.repositoryMethod,
                    replacements,
                  );

                  methodContent = replacePlaceholders(loopContent, {
                    ...replacements,
                    repositoryMethod: processedMethod,
                  });
                } else {
                  // For all other templates, process with all available properties
                  methodContent = replacePlaceholders(
                    loopContent,
                    replacements,
                  );
                }

                methodsMap.set(primaryValue, methodContent);
              }
            } catch (error) {
              console.warn(`Error parsing YAML in ${file.name}:`, error);
            }
          });

        // Build the output by groups
        const output: string[] = [];
        Object.entries(groups).forEach(([groupName, group]) => {
          output.push(`\n    // ${groupName}\n`);
          group.methods.forEach((methodName) => {
            const methodContent = methodsMap.get(methodName);
            if (typeof methodContent === 'string') {
              output.push(methodContent);
            }
          });
        });

        return output.join('\n\n');
      },
    );

    // Handle regular table loops
    const loopRegex = /\[\[LOOP_TABLES\s+([^\]]+)\]\]/g;
    return content.replace(loopRegex, (_match: string, loopContent: string) => {
      return masterSchema
        .map((table) => {
          const replacements = getReplacementsForTable(table);
          return replacePlaceholders(
            String(loopContent).trim(),
            replacements,
            table,
          );
        })
        .join('\n    '); // Add proper indentation for PHP files
    });
  };

  const loadConstant = (
    constantName: string,
    table?: ISchemaInfo,
  ): string[] => {
    const store = userFiles;
    const constantsFolder = store.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === 'Constants',
    );

    if (!constantsFolder) {
      console.warn('Constants folder not found');
      return [];
    }

    const constantFile = constantsFolder.children.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === `${constantName}.yaml`,
    );

    if (!constantFile) {
      console.warn(`Constant file not found: ${constantName}.yaml`);
      return [];
    }

    try {
      // Preprocess content to quote values with curly braces to ensure they're parsed as strings
      const preprocessedContent = constantFile.content.replace(
        /^-\s*(\{\{[^}]+\}\})\s*$/gm,
        '- "$1"',
      );

      // Parse YAML content
      const parsed: unknown = parse(preprocessedContent);

      // Type guard for Record<string, unknown>
      function isRecord(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === 'object';
      }

      // First get raw values without processing placeholders
      let rawValues: string[] = [];

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
        const replacements = getReplacementsForTable(table);
        return rawValues.map((value) =>
          replacePlaceholders(value, replacements, table),
        );
      }

      return rawValues;
    } catch (error) {
      console.warn(`Error parsing constant file ${constantName}.yaml:`, error);
      return [];
    }
  };

  const processCommand = (text: string, table?: ISchemaInfo): string => {
    // Process all commands in order of specificity
    let result = text;

    // First, process USE_CONSTANT commands
    result = result.replace(
      /\[\[\s*USE_CONSTANT\(([^)]+)\)\s*\]\]/g,
      (_match: string, group1: string) => {
        if (!table) {
          return '';
        }
        const constantName = String(group1).trim();
        return loadConstant(constantName, table).join(',');
      },
    );

    result = result.replace(
      /\[\[\s*ITERATE\(([^[\]]*?(?:\{\{[^}]*\}\})?[^[\]]*)\)([^\]]*)\]\]/g,
      (fullMatch: string, group1: string, group2: string) => {
        if (!table) {
          return '';
        }
        const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
        const propertyPaths = String(group1);
        const options = String(group2);
        const cmdResult = processIterateCommand(
          `ITERATE(${propertyPaths})${options}`,
          table,
        );
        return cmdResult ? String(whitespace) + String(cmdResult) : '';
      },
    );

    return result;
  };

  const processIterateCommand = (
    command: string,
    table: ISchemaInfo | undefined,
  ): string => {
    // Extract the property path and options
    // Make the closing parenthesis optional and handle incomplete commands
    const match = /ITERATE\((.*?)(?:\)(\s*.*))?$/.exec(command);
    if (!match || !table) {
      return '';
    }

    const [, propertyPathsStr, options = ''] = match;

    // Parse options
    const templateMatch = /--template="([^"]+)"/.exec(options);
    const separatorMatch = /--separator="([^"]+)"/.exec(options);
    const removeDuplicates = options.includes('--removeDuplicates');
    const ignoreMatch = /--ignore="([^"]+)"/.exec(options);
    const filterMatch = /--filter="([^"]+)"/.exec(options);

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
      : '\n';

    // Parse ignore list with flexible whitespace and handle USE_CONSTANT
    const ignoreList = ignoreMatch
      ? ignoreMatch[1]
          .split(',')
          .map((item) => {
            const trimmed = item.trim();
            const constantMatch = /\[\[\s*USE_CONSTANT\(([^)]+)\)\s*\]\]/.exec(
              trimmed,
            );
            if (constantMatch) {
              // Get raw values from constant file without any processing
              return loadConstant(constantMatch[1]);
            }
            // For non-constant values, still process any placeholders they might have
            const replacements = getReplacementsForTable(table);
            return replacePlaceholders(trimmed, replacements, table);
          })
          .flat()
      : [];

    // Parse filter list with flexible whitespace and handle USE_CONSTANT
    const filterList = filterMatch
      ? filterMatch[1].split(',').map((item) => {
          const trimmed = item.trim();
          const constantMatch = /\[\[\s*USE_CONSTANT\(([^)]+)\)\s*\]\]/.exec(
            trimmed,
          );
          if (constantMatch) {
            // Get raw values from constant file and return as an array
            return loadConstant(constantMatch[1], table);
          }
          // For non-constant values, still process any placeholders they might have
          const replacements = getReplacementsForTable(table);
          return replacePlaceholders(trimmed, replacements, table);
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

    // Helper function to process IF conditions in a template
    const processIfConditions = (
      template: string,
      column: IColumnInfo,
    ): string => {
      // Process column info
      console.warn(
        'Processing column:',
        column.column_name,
        'type:',
        column.data_type,
        'nullable:',
        column.is_nullable,
      );

      // Process column_name conditions
      let result = template.replace(
        /{%\s*IF\s+column_name\s+(EQUALS|NOT\s+EQUAL)\s+'([^']+)'\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (
          _match: string,
          operator: string,
          value: string,
          content: string,
        ): string => {
          const columnName = column.column_name;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'EQUALS') {
            conditionMet = columnName === value;
          } else if (operator === 'NOT EQUAL') {
            conditionMet = columnName !== value;
          }

          // Log the condition result
          console.warn(
            'Column name condition:',
            columnName,
            operator,
            value,
            '=',
            conditionMet,
          );

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process data_type conditions with quoted values
      result = result.replace(
        /{%\s*IF\s+data_type\s+(EQUALS|NOT\s+EQUAL|CONTAINS|NOT\s+CONTAINS)\s+'([^']+)'\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (
          _match: string,
          operator: string,
          value: string,
          content: string,
        ): string => {
          const dataType = column.data_type;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'EQUALS') {
            conditionMet = dataType === value;
            console.warn(
              `Evaluating data type condition: "${String(dataType)}" EQUALS "${String(value)}" = ${String(conditionMet)}`,
            );
          } else if (operator === 'NOT EQUAL') {
            conditionMet = dataType !== value;
            console.warn(
              `Evaluating data type condition: "${String(dataType)}" NOT EQUAL "${String(value)}" = ${String(conditionMet)}`,
            );
          } else if (operator === 'CONTAINS') {
            conditionMet = dataType.includes(value);
            console.warn(
              `Evaluating data type condition: "${String(dataType)}" CONTAINS "${String(value)}" = ${String(conditionMet)}`,
            );
          } else if (operator === 'NOT CONTAINS') {
            conditionMet = !dataType.includes(value);
            console.warn(
              `Evaluating data type condition: "${String(dataType)}" NOT CONTAINS "${String(value)}" = ${String(conditionMet)}`,
            );
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process data_type conditions with unquoted values
      result = result.replace(
        /{%\s*IF\s+data_type\s+(EQUALS|NOT\s+EQUAL|CONTAINS|NOT\s+CONTAINS)\s+([^'"\s]+)\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (
          _match: string,
          operator: string,
          value: string,
          content: string,
        ): string => {
          const dataType = column.data_type;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'EQUALS') {
            conditionMet = dataType === value;
          } else if (operator === 'NOT EQUAL') {
            conditionMet = dataType !== value;
          } else if (operator === 'CONTAINS') {
            conditionMet = dataType.includes(value);
          } else if (operator === 'NOT CONTAINS') {
            conditionMet = !dataType.includes(value);
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process is_nullable conditions
      result = result.replace(
        /{%\s*IF\s+is_nullable\s+(EQUALS|NOT\s+EQUAL)\s+'([^']+)'\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (
          _match: string,
          operator: string,
          value: string,
          content: string,
        ): string => {
          const isNullable = column.is_nullable;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'EQUALS') {
            conditionMet = isNullable === value;
            console.warn(
              `Evaluating is_nullable condition: "${String(isNullable)}" EQUALS "${String(value)}" = ${String(conditionMet)}`,
            );
          } else if (operator === 'NOT EQUAL') {
            conditionMet = isNullable !== value;
            console.warn(
              `Evaluating is_nullable condition: "${String(isNullable)}" NOT EQUAL "${String(value)}" = ${String(conditionMet)}`,
            );
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process is_nullable conditions with unquoted values
      result = result.replace(
        /{%\s*IF\s+is_nullable\s+(EQUALS|NOT\s+EQUAL)\s+([^'"\s]+)\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (
          _match: string,
          operator: string,
          value: string,
          content: string,
        ): string => {
          const isNullable = column.is_nullable;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'EQUALS') {
            conditionMet = isNullable === value;
          } else if (operator === 'NOT EQUAL') {
            conditionMet = isNullable !== value;
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process column_default conditions
      result = result.replace(
        /{%\s*IF\s+column_default\s+(EQUALS|NOT\s+EQUAL|CONTAINS|NOT\s+CONTAINS|IS\s+NULL|IS\s+NOT\s+NULL)\s*(?:'([^']+)')?\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (
          _match: string,
          operator: string,
          value: string | undefined,
          content: string,
        ): string => {
          const columnDefault = column.column_default;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'IS NULL') {
            conditionMet =
              columnDefault === null || columnDefault === undefined;
          } else if (operator === 'IS NOT NULL') {
            conditionMet =
              columnDefault !== null && columnDefault !== undefined;
          } else if (value !== undefined) {
            if (operator === 'EQUALS') {
              conditionMet =
                columnDefault !== null &&
                columnDefault !== undefined &&
                String(columnDefault) === value;
            } else if (operator === 'NOT EQUAL') {
              conditionMet =
                columnDefault === null ||
                columnDefault === undefined ||
                String(columnDefault) !== value;
            } else if (operator === 'CONTAINS') {
              conditionMet =
                columnDefault !== null &&
                columnDefault !== undefined &&
                String(columnDefault).includes(value);
            } else if (operator === 'NOT CONTAINS') {
              conditionMet =
                columnDefault === null ||
                columnDefault === undefined ||
                !String(columnDefault).includes(value);
            }
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process primary_key conditions
      result = result.replace(
        /{%\s*IF\s+primary_key\s+(IS\s+TRUE|IS\s+FALSE)\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (_match: string, operator: string, content: string): string => {
          const isPrimaryKey = column.primary_key === true;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'IS TRUE') {
            conditionMet = isPrimaryKey;
          } else if (operator === 'IS FALSE') {
            conditionMet = !isPrimaryKey;
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process unique conditions
      result = result.replace(
        /{%\s*IF\s+unique\s+(IS\s+TRUE|IS\s+FALSE)\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (_match: string, operator: string, content: string): string => {
          const isUnique = column.unique === true;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'IS TRUE') {
            conditionMet = isUnique;
          } else if (operator === 'IS FALSE') {
            conditionMet = !isUnique;
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process foreign_key conditions
      result = result.replace(
        /{%\s*IF\s+foreign_key\s+(EXISTS|NOT\s+EXISTS)\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (_match: string, operator: string, content: string): string => {
          const hasForeignKey = column.foreign_key !== undefined;

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'EXISTS') {
            conditionMet = hasForeignKey;
          } else if (operator === 'NOT EXISTS') {
            conditionMet = !hasForeignKey;
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      // Process foreign_table_name conditions
      result = result.replace(
        /{%\s*IF\s+foreign_table_name\s+(EQUALS|NOT\s+EQUAL|CONTAINS|NOT\s+CONTAINS)\s+'([^']+)'\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g,
        (
          _match: string,
          operator: string,
          value: string,
          content: string,
        ): string => {
          const foreignTableName = column.foreign_key?.foreign_table_name;

          // If no foreign key, condition is not met
          if (foreignTableName === undefined) {
            return '';
          }

          // Evaluate the condition
          let conditionMet = false;
          if (operator === 'EQUALS') {
            conditionMet = foreignTableName === value;
          } else if (operator === 'NOT EQUAL') {
            conditionMet = foreignTableName !== value;
          } else if (operator === 'CONTAINS') {
            conditionMet = foreignTableName.includes(value);
          } else if (operator === 'NOT CONTAINS') {
            conditionMet = !foreignTableName.includes(value);
          }

          // Return the content if condition is met, otherwise empty string
          return conditionMet ? content : '';
        },
      );

      return result;
    };

    // Helper function to process columnsInfo iteration with IF conditions
    const processColumnsInfoIteration = (
      tableObj: ISchemaInfo,
      templateStr: string,
      separatorStr: string,
    ): string => {
      console.warn(
        `Processing columnsInfo iteration for table: ${String(tableObj.tableName)}`,
      );
      console.warn(
        `Template string length: ${String(templateStr.length)} characters`,
      );

      // Process each column individually
      const results: string[] = [];

      for (const column of tableObj.columnsInfo) {
        // Create a copy of the template for this column
        let processedTemplate = templateStr;

        console.warn(
          `Processing column: ${String(column.column_name)}, type: ${String(column.data_type)}, nullable: ${String(column.is_nullable)}`,
        );

        // Process IF conditions
        processedTemplate = processIfConditions(processedTemplate, column);

        // Get case variations for the column name
        const caseFormats = changeCase(column.column_name);

        // Create replacements for this column
        const replacements = {
          value: column.column_name,
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
          // For columnsInfo iteration, add columnNameCamelCase as an alias for valueCamelCase
          columnNameCamelCase: caseFormats.camelCase,
          // Add column properties
          data_type: column.data_type,
          is_nullable: column.is_nullable,
          column_default: column.column_default ?? '',
          is_primary_key: column.primary_key === true ? 'true' : 'false',
          is_unique: column.unique === true ? 'true' : 'false',
          foreign_table: column.foreign_key?.foreign_table_name ?? '',
          foreign_column: column.foreign_key?.foreign_column_name ?? '',
          has_foreign_key: column.foreign_key !== undefined ? 'true' : 'false',
          // Add table replacements for other placeholders that might be in the template
          ...getReplacementsForTable(tableObj),
        };

        // Replace placeholders
        const result = replacePlaceholders(
          processedTemplate,
          replacements,
          tableObj,
        );
        if (result.trim()) {
          results.push(result);
          console.warn(
            `Added processed result for column: ${String(column.column_name)}`,
          );
        } else {
          console.warn(
            `Empty result for column: ${String(column.column_name)}, skipping`,
          );
        }
      }

      const finalResult = results.join(separatorStr);
      console.warn(
        `Final columnsInfo iteration result length: ${String(finalResult.length)} characters`,
      );
      return finalResult;
    };

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
      return processColumnsInfoIteration(table, template, separator);
    }

    // For other types of iterations, use the original logic
    // Collect all values from all properties
    const allValues: string[] = [];

    // Special handling for user folder paths (starting with /)
    const folderPathPattern = /^\/(.+)$/;
    // Create a map to store all placeholder values for each method/value
    const allPlaceholderValues = new Map<string, Record<string, string>>();
    for (const path of propertyPaths) {
      const folderMatch = folderPathPattern.exec(path);
      if (folderMatch) {
        const [, folderPath] = folderMatch;
        console.warn(`Processing folder path: ${String(folderPath)}`);

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
          console.warn(
            `Found folder: ${String(currentFolder.name)} with ${String(currentFolder.children.length)} children`,
          );

          // Process all YAML files in the folder
          const methodNames: string[] = [];

          // Process each file in the folder
          currentFolder.children.forEach((item) => {
            if (item.type === 'file') {
              const fileName = item.name.replace(/\.[^.]+$/, '');

              // For YAML files, try to extract structured data
              if (item.name.endsWith('.yaml') || item.name.endsWith('.yml')) {
                try {
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
                        extractedValues.value = fileName;
                      }

                      // Determine primary value to use for the iteration
                      let primaryValue = extractedValues.value || fileName;

                      // Try common identifier properties first
                      const identifiers = ['id', 'name', 'key', 'identifier'];
                      for (const id of identifiers) {
                        if (id in extractedValues) {
                          primaryValue = extractedValues[id];
                          break;
                        }
                      }

                      methodNames.push(primaryValue);
                      allPlaceholderValues.set(primaryValue, extractedValues);
                      console.warn(
                        `Added values from YAML: ${String(primaryValue)} with ${String(Object.keys(extractedValues).length)} properties`,
                      );
                      return; // Skip to next file
                    }
                  }
                } catch (error) {
                  console.warn(
                    `Error processing YAML file ${String(item.name)}: ${String(error instanceof Error ? error.message : 'Unknown error')}`,
                  );
                }
              }

              // Fallback for non-YAML files or if YAML processing failed
              methodNames.push(fileName);
              allPlaceholderValues.set(fileName, { value: fileName });
              console.warn(`Added filename as value: ${String(fileName)}`);
            }
          });

          // Add all method names to the allValues array
          if (methodNames.length > 0) {
            allValues.push(...methodNames);
            console.warn(
              `Added ${String(methodNames.length)} values from folder ${String(currentFolder.name)}`,
            );
          }
        } else {
          console.warn(`Folder not found: ${String(folderPath)}`);
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
            const values = schemaInfo.getAllColumns(table.tableName);
            allValues.push(...values);
            continue;
          }
          case 'getRequiredColumns': {
            const values = schemaInfo.getRequiredColumns(table.tableName);
            allValues.push(...values);
            continue;
          }
          case 'getPrimaryKey': {
            const value = schemaInfo.getPrimaryKey(table.tableName);
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
        ...getReplacementsForTable(table),
      };

      // Add all placeholders found in the YAML file for this value
      const placeholders = allPlaceholderValues.get(value);
      if (placeholders !== undefined) {
        Object.entries(placeholders).forEach(([key, val]) => {
          replacements[key] = val;
        });
      }

      return replacePlaceholders(template, replacements, table);
    });

    return joinWithSeparator(lines);
  };

  const replacePlaceholders = (
    text: string,
    replacements: Record<string, string | string[]>,
    table?: ISchemaInfo,
  ): string => {
    // First process all commands
    const processedText = processCommand(text, table);

    // Then handle the regular placeholders
    return processedText.replace(
      /\$_([^_]+)_\$|\{\{([^}]+)\}\}/g,
      (
        _,
        placeholder1: string | undefined,
        placeholder2: string | undefined,
      ) => {
        const key = (placeholder2 ?? placeholder1 ?? '').trim();
        if (key.length === 0) {
          return '';
        }
        if (!(key in replacements)) {
          console.warn(`No replacement found for placeholder: ${String(key)}`);
          return key;
        }
        const value = replacements[key];
        // Handle array values by joining them with commas
        return Array.isArray(value) ? value.join(',') : value;
      },
    );
  };

  const processMultipleFiles = (
    fileName: string,
    options: ICommandOptions = {},
  ): IFile[] => {
    // Get the template content once
    let templateContent = '';
    if (typeof options.template === 'string' && options.template.length > 0) {
      const loadedContent = loadTemplateContent(options.template);
      if (loadedContent.length > 0) {
        templateContent = loadedContent;
      }
    } else {
      // Try to load template based on filename if no template option provided
      templateContent = loadTemplateContent(fileName);
    }

    const files: IFile[] = masterSchema.map((table) => {
      const replacements = getReplacementsForTable(table);
      const processedName = replacePlaceholders(fileName, replacements);

      let content = '';
      content = replacePlaceholders(
        processLoopTables(templateContent),
        {
          ...replacements,
          modelSpecificRoutes: options.modelSpecificRoutes ?? '',
          baseRoutesForController: options.baseRoutesForController ?? '',
        },
        table,
      );

      // Process ITERATE commands
      content = processIterateCommandsInContent(content, table);

      // Format with consistent character handling
      const finalContent = formatFileContent(content);

      return {
        type: 'file',
        name: processedName,
        content: finalContent,
      };
    });

    // Filter out any empty files
    return files;
  };

  const processDynamicFolders = (
    folderName: string,
    children: unknown,
  ): IStructure => {
    return masterSchema.map((table) => {
      const replacements = getReplacementsForTable(table);
      const processedName = replacePlaceholders(folderName, replacements);

      // Process children with the current table context
      const processedChildren = processYamlNodeWithContext(children, table);

      return {
        type: 'folder',
        name: processedName,
        children: processedChildren,
      };
    });
  };

  const processYamlNodeWithContext = (
    node: unknown,
    table: ISchemaInfo,
  ): IStructure => {
    if (typeof node === 'string') {
      if (node.startsWith('CREATE_FILE(')) {
        const { command, options } = parseCommand(node.slice(12, -1));

        // Skip file if conditions are not met
        const conditions = options.conditions;
        if (
          conditions &&
          conditions.length > 0 &&
          !checkConditions(conditions)
        ) {
          return [];
        }

        const replacements = getReplacementsForTable(table);
        const processedName = replacePlaceholders(command, replacements);

        // Load and process template content
        const templateContent = loadTemplateContent(options.template ?? processedName);
        const processedContent = replacePlaceholders(
          processLoopTables(templateContent),
          {
            ...replacements,
            modelSpecificRoutes: options.modelSpecificRoutes ?? '',
            baseRoutesForController: options.baseRoutesForController ?? '',
          },
          table,
        );

        // Process ITERATE commands
        const contentWithIterates = processIterateCommandsInContent(processedContent, table);
        
        // Format the final content with proper character replacements
        const finalContent = formatFileContent(contentWithIterates);

        return [
          {
            type: 'file',
            name: processedName.replace(/[()]/g, ''),
            content: finalContent,
          },
        ];
      }
      if (node.startsWith('CREATE_MULTIPLE_FILES(')) {
        const { command, options } = parseCommand(node.slice(21, -1));
        return processMultipleFiles(command, options);
      }
      if (node.startsWith('@LOOP_TABLES(')) {
        return [
          {
            type: 'file',
            name: 'template.tmp',
            content: `@loop: tables\n${node}`,
          },
        ];
      }

      // Handle bare filenames by looking for templates
      const templateContent = loadTemplateContent(node);
      if (templateContent.length > 0) {
        const replacements = getReplacementsForTable(table);
        
        // Process the template content with all replacements
        let processedContent = replacePlaceholders(
          processLoopTables(templateContent),
          replacements,
          table
        );
        
        // Process ITERATE commands explicitly
        processedContent = processIterateCommandsInContent(processedContent, table);
        
        // Format the final content with proper character replacements
        const finalContent = formatFileContent(processedContent);

        return [
          {
            type: 'file',
            name: node,
            content: finalContent,
          },
        ];
      }

      return [
        {
          type: 'file',
          name: node,
          content: '',
        },
      ];
    }

    if (Array.isArray(node)) {
      return node.flatMap((item) => processYamlNodeWithContext(item, table));
    }

    if (typeof node === 'object' && node !== null) {
      return Object.entries(node).flatMap(([key, value]): IStructure => {
        // Handle conditional folders
        const { name, conditions } = parseConditionalFolder(key);
        if (conditions && !checkConditions(conditions)) {
          return [
            {
              type: 'folder',
              name: name.replace(/[()]/g, ''),
              children: [],
            },
          ];
        }

        if (key.startsWith('CREATE_DYNAMIC_FOLDERS(')) {
          // Extract folder name and remove parentheses
          const folderName = key.slice(22, -1).replace(/[()]/g, '');
          // Return the dynamic folders directly without an extra parent folder
          return processDynamicFolders(folderName, value);
        }

        return [
          {
            type: 'folder',
            name: name.replace(/[()]/g, ''),
            children: processYamlNodeWithContext(value, table),
          },
        ];
      });
    }

    return [];
  };

  // Implement the processIterateCommandsInContent function before the formatFileContent function
  const processIterateCommandsInContent = (content: string, table?: ISchemaInfo): string => {
    return content.replace(
      /\[\[\s*ITERATE\(([^[\]]*?(?:\{\{[^}]*\}\})?[^[\]]*)\)([^\]]*)\]\]/g,
      (fullMatch: string, propertyPathsStr: string, options: string) => {
        // If no table context is provided, try to use the first schema
        if (!table && masterSchema.length > 0) {
          table = masterSchema[0];
        }
        
        // If we have a valid table context, process the ITERATE command
        if (table) {
          const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
          const cmdResult = processIterateCommand(
            `ITERATE(${String(propertyPathsStr)})${String(options)}`,
            table
          );
          return cmdResult ? String(whitespace) + String(cmdResult) : '';
        }
        
        // If no valid table context is available, return the original match
        return fullMatch;
      }
    );
  };

  // Add a helper function to ensure consistent formatting
  const formatFileContent = (content: string): string => {
    return content
      .replace(/\\n/g, '\n')  // Replace \n with actual newlines
      .replace(/\\t/g, '    ') // Replace \t with four spaces
      .replace(/\t/g, '    ')  // Replace tab characters with four spaces
      .trim();
  };

  const processYamlNode = (node: unknown): IStructure => {
    if (typeof node === 'string') {
      if (node.startsWith('CREATE_FILE(')) {
        const { command, options } = parseCommand(node.slice(12, -1));

        // Skip file if conditions are not met
        const conditions = options.conditions;
        if (
          conditions &&
          conditions.length > 0 &&
          !checkConditions(conditions)
        ) {
          return [];
        }

        const schemaInfo = masterSchema.length > 0 ? masterSchema[0] : undefined;
        if (!schemaInfo) {
          console.warn('No schema information available for replacements.');
          return [];
        }

        const replacements = getReplacementsForTable(schemaInfo);
        const processedName = replacePlaceholders(command, replacements);

        // Load and process template content
        const templateContent = loadTemplateContent(options.template ?? processedName);
        
        // Process the template with all replacements
        let processedContent = replacePlaceholders(
          processLoopTables(templateContent),
          replacements,
          schemaInfo
        );
        
        // Process ITERATE commands explicitly using the same function as bare filenames
        processedContent = processIterateCommandsInContent(processedContent, schemaInfo);
        
        // Format the final content with proper character replacements
        const finalContent = formatFileContent(processedContent);

        return [
          {
            type: 'file',
            name: processedName.replace(/[()]/g, ''),
            content: finalContent,
          },
        ];
      }
      if (node.startsWith('CREATE_MULTIPLE_FILES(')) {
        const { command, options } = parseCommand(node.slice(21, -1));
        return processMultipleFiles(command, options);
      }
      if (node.startsWith('@LOOP_TABLES(')) {
        return [
          {
            type: 'file',
            name: 'template.tmp',
            content: `@loop: tables\n${node}`,
          },
        ];
      }

      // Handle bare filenames by looking for templates
      const templateContent = loadTemplateContent(node);
      if (templateContent.length > 0) {
        const schemaInfo = masterSchema.length > 0 ? masterSchema[0] : undefined;
        if (!schemaInfo) {
          console.warn('No schema information available for replacements.');
          return [];
        }

        const replacements = getReplacementsForTable(schemaInfo);
        
        // Process the template content with all replacements
        let processedContent = replacePlaceholders(
          processLoopTables(templateContent),
          replacements,
          schemaInfo
        );
        
        // Process ITERATE commands explicitly
        processedContent = processIterateCommandsInContent(processedContent, schemaInfo);
        
        // Format the final content with proper character replacements
        const finalContent = formatFileContent(processedContent);

        return [
          {
            type: 'file',
            name: node,
            content: finalContent,
          },
        ];
      }

      return [
        {
          type: 'file',
          name: node,
          content: '',
        },
      ];
    }

    if (Array.isArray(node)) {
      return node.flatMap((item) => processYamlNode(item));
    }

    if (typeof node === 'object' && node !== null) {
      return Object.entries(node).flatMap(([key, value]): IStructure => {
        // Handle conditional folders
        const { name, conditions } = parseConditionalFolder(key);
        if (conditions && !checkConditions(conditions)) {
          return [
            {
              type: 'folder',
              name: name.replace(/[()]/g, ''),
              children: [],
            },
          ];
        }

        if (key.startsWith('CREATE_DYNAMIC_FOLDERS(')) {
          // Extract folder name and remove parentheses
          const folderName = key.slice(22, -1).replace(/[()]/g, '');
          // Return the dynamic folders directly without an extra parent folder
          return processDynamicFolders(folderName, value);
        }

        return [
          {
            type: 'folder',
            name: name.replace(/[()]/g, ''),
            children: processYamlNode(value),
          },
        ];
      });
    }

    return [];
  };

  try {
    const parsedYaml: unknown = parse(yamlContent);
    if (!_isYamlObject(parsedYaml)) {
      throw new Error('Invalid YAML content');
    }
    return processYamlNode(parsedYaml);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error parsing YAML:', error.message);
    } else {
      console.error('Unknown error parsing YAML');
    }
    return [];
  }
};
