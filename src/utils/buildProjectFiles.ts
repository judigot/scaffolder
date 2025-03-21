import { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import config from '@/config/config.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';

// Configuration for folder names that can be changed in one place
const folderConfig = {
  methodsFolder: 'BaseMethods',
  methodGroupFile: 'base-methods-group.yaml',
  methodGroupFileAlt: 'base-method-group.yaml',
};


export const buildProjectFiles = (
  projectYamlPath: string,
  userFiles: IStructure,
  schemaInfo: ISchemaInfo[],
): IStructure => {
  const schemaInfoProcessed = getSchemaInfo(schemaInfo);
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

  // Find the YAML file in userFiles
  const findFileInStructure = (
    path: string,
    structure: IStructure
  ): IFile | undefined => {
    // Remove leading slash if present
    const normPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Split the path into components
    const pathComponents = normPath.split('/');
    const fileName = pathComponents.pop() ?? '';
    
    // Navigate through the directory structure
    let currentItems: IStructure = structure;
    
    for (const component of pathComponents) {
      const folder = currentItems.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === component,
      );
      
      if (!folder) {
        console.warn(`Folder not found in path: ${String(component)}`);
        return undefined;
      }
      
      currentItems = folder.children;
    }
    
    // Find the file in the final directory
    return currentItems.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === fileName,
    );
  };

  // Get the YAML content from the specified path
  const projectFile = findFileInStructure(projectYamlPath, userFiles);
  
  if (!projectFile) {
    console.error(`Project YAML file not found at path: ${String(projectYamlPath)}`);
    return [];
  }
  
  const yamlContent = projectFile.content;

  const loadTemplateContent = (templatePath: string): string => {
    const store = userFiles;
    
    // Check if templatePath starts with a forward slash indicating an absolute path
    if (templatePath.startsWith('/')) {
      // Remove the leading slash
      const normPath = templatePath.substring(1);
      
      // Split the path into components
      const pathComponents = normPath.split('/');
      const lastComponent = pathComponents.pop();
      const templateName = lastComponent ?? '';
      
      // Navigate through the directory structure
      let currentItems: IStructure = store;
      
      for (const component of pathComponents) {
        const folder = currentItems.find(
          (item): item is IFolder =>
            item.type === 'folder' && item.name === component,
        );
        
        if (!folder) {
          console.warn(`Folder not found in path: ${component}`);
          return '';
        }
        
        currentItems = folder.children;
      }
      
      // Find the template file in the final directory
      const templateFile = currentItems.find(
        (item): item is IFile =>
          item.type === 'file' && item.name === templateName,
      );
      
      if (!templateFile) {
        console.warn(`Template file not found: ${templateName} in specified path`);
        return '';
      }
      
      function replaceOutsideTemplateSeparator(input: string): string {
        const placeholders: string[] = [];
        let index = 0;

        const pattern = /(--template="[^"]*"|--separator="[^"]*")/g;

        // 1) Temporarily replace those segments with placeholders
        let protectedString = input.replace(pattern, (match: string) => {
          placeholders.push(match);
          const placeholder = `__PLACEHOLDER_${String(index)}__`;
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
    } else {
      // Handle the original case (just the filename without path)
      // Look only in the root for the template file
      const templateFile = store.find(
        (item): item is IFile =>
          item.type === 'file' && item.name === templatePath,
      );

      if (templateFile) {
        function replaceOutsideTemplateSeparator(input: string): string {
          const placeholders: string[] = [];
          let index = 0;

          const pattern = /(--template="[^"]*"|--separator="[^"]*")/g;

          // 1) Temporarily replace those segments with placeholders
          let protectedString = input.replace(pattern, (match: string) => {
            placeholders.push(match);
            const placeholder = `__PLACEHOLDER_${String(index)}__`;
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
      }
      
      console.warn(`Template file not found in root: ${templatePath}`);
      return '';
    }
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
      'getPrimaryKey()': schemaInfoProcessed.getPrimaryKey(table.tableName),
      'getRequiredColumns()': schemaInfoProcessed.getRequiredColumns(table.tableName),
      'getAllColumns()': schemaInfoProcessed.getAllColumns(table.tableName),
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
      return schemaInfo
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
    const includedFilesMatch = /--include-files="([^"]+)"/.exec(options);
    const excludedFilesMatch = /--exclude-files="([^"]+)"/.exec(options);

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

    // Parse include and exclude filters
    const includedFiles = includedFilesMatch 
      ? includedFilesMatch[1].split(',').map(item => item.trim())
      : [];
    
    const excludedFiles = excludedFilesMatch
      ? excludedFilesMatch[1].split(',').map(item => item.trim()) 
      : [];

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
    
    // Track filenames separately to apply include/exclude filters
    const fileNameMap = new Map<string, string>();
    
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

          // Process all files in the folder
          currentFolder.children.forEach((item) => {
            if (item.type === 'file') {
              const fileName = item.name;
              const fileBaseName = fileName.replace(/\.[^.]+$/, '');
              
              // Apply include/exclude filters based on the filename
              const shouldInclude = includedFiles.length === 0 || 
                includedFiles.some(pattern => fileName.includes(pattern));
              
              const shouldExclude = excludedFiles.length > 0 && 
                excludedFiles.some(pattern => fileName.includes(pattern));
              
              // Skip this file if it doesn't meet the include/exclude criteria
              if (!shouldInclude || shouldExclude) {
                console.warn(`Skipping file ${fileName} based on include/exclude filters`);
                return;
              }

              console.warn(`Processing file ${fileName} that matches include/exclude filters`);

              // For YAML files, try to extract structured data
              if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
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
                      console.warn(
                        `Added values from YAML: ${String(primaryValue)} with ${String(Object.keys(extractedValues).length)} properties`,
                      );
                      return; // Skip to next file
                    }
                  }
                } catch (error) {
                  console.warn(
                    `Error processing YAML file ${String(fileName)}: ${String(error instanceof Error ? error.message : 'Unknown error')}`,
                  );
                }
              }

              // Fallback for non-YAML files or if YAML processing failed
              allValues.push(fileBaseName);
              allPlaceholderValues.set(fileBaseName, { value: fileBaseName });
              fileNameMap.set(fileBaseName, fileName);
              console.warn(`Added filename as value: ${String(fileBaseName)}`);
            }
          });
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
            const values = schemaInfoProcessed.getAllColumns(table.tableName);
            allValues.push(...values);
            continue;
          }
          case 'getRequiredColumns': {
            const values = schemaInfoProcessed.getRequiredColumns(table.tableName);
            allValues.push(...values);
            continue;
          }
          case 'getPrimaryKey': {
            const value = schemaInfoProcessed.getPrimaryKey(table.tableName);
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
    
    // Then process IF conditions
    const processedConditions = processIfConditions(processedText, replacements);

    // Then handle the regular placeholders
    return processedConditions.replace(
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

  // Add a function to process ITERATE commands in template content
  const processIterateInTemplate = (content: string, table?: ISchemaInfo): string => {
    return content.replace(
      /\[\[\s*ITERATE\(([^[\]]*?(?:\{\{[^}]*\}\})?[^[\]]*)\)([^\]]*)\]\]/g,
      (fullMatch: string, propertyPathsStr: string, options: string) => {
        // If no table context is provided, try to use the first schema
        if (!table && schemaInfo.length > 0) {
          table = schemaInfo[0];
        }
        
        // If we have a valid table context, process the ITERATE command
        if (table) {
          const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
          const cmdResult = processIterateCommand(
            `ITERATE(${propertyPathsStr})${options}`,
            table
          );
          return cmdResult ? String(whitespace) + String(cmdResult) : '';
        }
        
        // If no valid table context is available, return the original match
        return fullMatch;
      }
    );
  };

  // Add this helper function right after formatFileContent
  const formatFileContent = (content: string): string => {
    return content
      .replace(/\\n/g, '\n')  // Replace \n with actual newlines
      .replace(/\\t/g, '    ') // Replace \t with four spaces
      .replace(/\t/g, '    ')  // Replace tab characters with four spaces
      .trim();
  };

  // Add a helper function to extract filename from path
  const extractFileNameFromPath = (path: string): string => {
    const pathComponents = path.split('/');
    return pathComponents[pathComponents.length - 1];
  };

  // Update the processMultipleFiles function
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

    const files: IFile[] = schemaInfo.map((table) => {
      const replacements = getReplacementsForTable(table);
      const processedName = replacePlaceholders(fileName, replacements);

      // Extract the base filename from the processed path if it contains slashes
      const outputFileName = processedName.includes('/') ? 
        extractFileNameFromPath(processedName) : processedName;

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
      content = processIterateInTemplate(content, table);

      // Format with consistent character handling
      const finalContent = formatFileContent(content);

      return {
        type: 'file',
        name: outputFileName,
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
    return schemaInfo.map((table) => {
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

  // Add the columnsInfo iteration function
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
      const processedTemplate = templateStr;

      console.warn(
        `Processing column: ${String(column.column_name)}, type: ${String(column.data_type)}, nullable: ${String(column.is_nullable)}`,
      );

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

    const finalContent = results.join(separatorStr);
    console.warn(
      `Final columnsInfo iteration result length: ${String(finalContent.length)} characters`,
    );
    return finalContent;
  };

  // Update processYamlNodeWithContext function
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

        const schemaInfoProcessed = schemaInfo.length > 0 ? schemaInfo[0] : undefined;
        if (!schemaInfoProcessed) {
          console.warn('No schema information available for replacements.');
          return [];
        }

        const replacements = getReplacementsForTable(schemaInfoProcessed);
        const processedName = replacePlaceholders(command, replacements);

        // Extract just the filename portion if it contains slashes
        const outputFileName = processedName.includes('/') ? 
          extractFileNameFromPath(processedName) : processedName.replace(/[()]/g, '');

        // Load and process template content
        const templateContent = loadTemplateContent(options.template ?? processedName);
        
        // Process the template with all replacements
        let processedContent = replacePlaceholders(
          processLoopTables(templateContent),
          replacements,
          schemaInfoProcessed
        );
        
        // Process ITERATE commands explicitly
        processedContent = processIterateInTemplate(processedContent, schemaInfoProcessed);
        
        // Format the final content with proper character replacements
        const finalContent = formatFileContent(processedContent);

        return [
          {
            type: 'file',
            name: outputFileName,
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
        const schemaInfoProcessed = schemaInfo.length > 0 ? schemaInfo[0] : undefined;
        if (!schemaInfoProcessed) {
          console.warn('No schema information available for replacements.');
          return [];
        }

        const replacements = getReplacementsForTable(schemaInfoProcessed);
        
        // Process the template content with all replacements
        let processedContent = replacePlaceholders(
          processLoopTables(templateContent),
          replacements,
          schemaInfoProcessed
        );
        
        // Process ITERATE commands explicitly
        processedContent = processIterateInTemplate(processedContent, schemaInfoProcessed);
        
        // Format the final content with proper character replacements
        const finalContent = formatFileContent(processedContent);

        // Extract just the filename from the path
        // Extract just the filename portion for the output
        const outputFileName = extractFileNameFromPath(node);

        return [
          {
            type: 'file',
            name: outputFileName,
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

  // Add a helper function to process IF conditions in templates
  const processIfConditions = (
    content: string,
    replacements: Record<string, string | string[]>,
  ): string => {
    // Process simple IF conditions without ENDIF
    const simpleIfPattern = /{%\s*IF\s+([^\s]+)\s+EQUALS\s+['"]?([^'"%{}]*)['"]?\s*%}([^{%]*){%\s*ENDIF\s*%}/g;
    content = content.replace(simpleIfPattern, (_match: string, variableName: string, value: string, ifContent: string) => {
      console.warn(`Processing IF condition: ${String(variableName)} EQUALS "${String(value)}" with content length ${String(ifContent.length)}`);
      
      // Check if the variable exists
      if (!(variableName in replacements)) {
        console.warn(`Variable ${String(variableName)} not found in replacements`);
        return '';
      }
      
      const variableValue = typeof replacements[variableName] === 'string' 
        ? String(replacements[variableName])  
        : '';
        
      console.warn(`Variable ${String(variableName)} has value "${String(variableValue)}", comparing with "${String(value)}"`);
      
      return variableValue === value ? ifContent : '';
    });
    
    // Process EQUALS with more complex content (may contain nested tags)
    const complexEqualsPattern = /{%\s*IF\s+([^\s]+)\s+EQUALS\s+['"]?([^'"%{}]*)['"]?\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g;
    content = content.replace(complexEqualsPattern, (_match: string, variableName: string, value: string, ifContent: string) => {
      console.warn(`Processing complex IF condition: ${String(variableName)} EQUALS "${String(value)}" with content length ${String(ifContent.length)}`);
      
      // Check if the variable exists
      if (!(variableName in replacements)) {
        console.warn(`Variable ${String(variableName)} not found in replacements`);
        return '';
      }
      
      const variableValue = typeof replacements[variableName] === 'string' 
        ? String(replacements[variableName])  
        : '';
        
      console.warn(`Variable ${String(variableName)} has value "${String(variableValue)}", comparing with "${String(value)}"`);
      
      return variableValue === value ? ifContent : '';
    });
    
    // Process NOT EQUAL with more complex content
    const notEqualsPattern = /{%\s*IF\s+([^\s]+)\s+NOT\s+EQUAL\s+['"]?([^'"%{}]*)['"]?\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g;
    content = content.replace(notEqualsPattern, (_match: string, variableName: string, value: string, ifContent: string) => {
      console.warn(`Processing NOT EQUAL condition: ${String(variableName)} NOT EQUAL "${String(value)}" with content length ${String(ifContent.length)}`);
      
      // Check if the variable exists
      if (!(variableName in replacements)) {
        console.warn(`Variable ${String(variableName)} not found in replacements`);
        return '';
      }
      
      const variableValue = typeof replacements[variableName] === 'string' 
        ? String(replacements[variableName])  
        : '';
        
      console.warn(`Variable ${String(variableName)} has value "${String(variableValue)}", comparing with "${String(value)}"`);
      
      return variableValue !== value ? ifContent : '';
    });
    
    // Process else condition format
    const elsePattern = /{%\s*IF\s+([^\s]+)\s+EQUALS\s+['"]?([^'"%{}]*)['"]?\s*%}([\s\S]*?){%\s*ELSE\s*%}([\s\S]*?){%\s*ENDIF\s*%}/g;
    content = content.replace(elsePattern, (_match: string, variableName: string, value: string, ifContent: string, elseContent: string) => {
      console.warn(`Processing IF/ELSE condition: ${String(variableName)} EQUALS "${String(value)}"`);
      
      // Check if the variable exists
      if (!(variableName in replacements)) {
        console.warn(`Variable ${String(variableName)} not found in replacements`);
        return elseContent; // Use else content if variable isn't found
      }
      
      const variableValue = typeof replacements[variableName] === 'string' 
        ? String(replacements[variableName])  
        : '';
        
      console.warn(`Variable ${String(variableName)} has value "${String(variableValue)}", comparing with "${String(value)}"`);
      
      return variableValue === value ? ifContent : elseContent;
    });
    
    return content;
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

        const schemaInfoProcessed = schemaInfo.length > 0 ? schemaInfo[0] : undefined;
        if (!schemaInfoProcessed) {
          console.warn('No schema information available for replacements.');
          return [];
        }

        const replacements = getReplacementsForTable(schemaInfoProcessed);
        const processedName = replacePlaceholders(command, replacements);

        // Extract just the filename portion if it contains slashes
        const outputFileName = processedName.includes('/') ? 
          extractFileNameFromPath(processedName) : processedName.replace(/[()]/g, '');

        // Load and process template content
        const templateContent = loadTemplateContent(options.template ?? processedName);
        
        // Process the template with all replacements
        let processedContent = replacePlaceholders(
          processLoopTables(templateContent),
          replacements,
          schemaInfoProcessed
        );
        
        // Process ITERATE commands explicitly
        processedContent = processIterateInTemplate(processedContent, schemaInfoProcessed);
        
        // Format the final content with proper character replacements
        const finalContent = formatFileContent(processedContent);

        return [
          {
            type: 'file',
            name: outputFileName,
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
        const schemaInfoProcessed = schemaInfo.length > 0 ? schemaInfo[0] : undefined;
        if (!schemaInfoProcessed) {
          console.warn('No schema information available for replacements.');
          return [];
        }

        const replacements = getReplacementsForTable(schemaInfoProcessed);
        
        // Process the template content with all replacements
        let processedContent = replacePlaceholders(
          processLoopTables(templateContent),
          replacements,
          schemaInfoProcessed
        );
        
        // Process ITERATE commands explicitly
        processedContent = processIterateInTemplate(processedContent, schemaInfoProcessed);
        
        // Format the final content with proper character replacements
        const finalContent = formatFileContent(processedContent);

        // Extract just the filename from the path
        const outputFileName = extractFileNameFromPath(node);

        return [
          {
            type: 'file',
            name: outputFileName,
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
