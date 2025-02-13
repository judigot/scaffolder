import { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import config from '@/config/config.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import { useStore } from '@/useMockDatabase.ts';

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
  const store = useStore.getState();
  const templatesFolder = store.userFiles.find(
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
    (item): item is IFile => item.type === 'file' && item.name === templateName,
  );

  if (!templateFile) {
    console.warn(`Template file not found: ${templateName}`);
    return '';
  }

  return templateFile.content;
};

const getReplacementsForTable = (
  table: ISchemaInfo,
): Record<string, string> => {
  const tableName = table.tableName;
  const caseFormats = changeCase(tableName);

  return {
    tableNamePascalCase: caseFormats.pascalCase,
    tableNamePascalCaseSingular: caseFormats.pascalCaseSingular,
    tableNameKebabCasePlural: caseFormats.kebabCasePlural,
    tableNamePlural: caseFormats.plural,
    tableNameSnakeCaseSingular: caseFormats.snakeCaseSingular,
    // Add all other case formats
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
    'getPrimaryKey()': getPrimaryKey(table),
    'getRequiredColumns()': getRequiredColumns(table).map(col => `'${col}'`).join(',\n        '),
  };
};

export const getPrimaryKey = (table: ISchemaInfo): string => {
  const primaryKeyColumn = table.columnsInfo.find((col) => col.primary_key === true);
  return primaryKeyColumn?.column_name ?? '';
};

export const getRequiredColumns = (table: ISchemaInfo): string[] => {
  const requiredFromColumns = table.columnsInfo
    .filter((col) => col.is_nullable === 'NO')
    .map((col) => col.column_name);

  const explicitlyRequired = table.requiredColumns ?? [];

  return [...new Set([...requiredFromColumns, ...explicitlyRequired])];
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
      const store = useStore.getState();
      const baseMethodsFolder = store.userFiles.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === 'BaseMethods',
      );

      if (!baseMethodsFolder) {
        console.warn('BaseMethods folder not found');
        return '';
      }

      // Load the base-methods-group.yaml to get the groups
      const groupFile = store.userFiles.find(
        (item): item is IFile =>
          item.type === 'file' && item.name === 'base-methods-group.yaml',
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

      interface IBaseMethodYAML {
        methodName: string;
        route: string;
        description: string;
        repositoryMethod: string;
        repositoryContent: string;
        serviceMethod: string;
        serviceContent: string;
        controllerMethod: string;
        controllerContent: string;
      }

      const isBaseMethodYAML = (value: unknown): value is IBaseMethodYAML => {
        if (!isRecord(value)) {
          return false;
        }
        return (
          typeof value.methodName === 'string' &&
          typeof value.controllerMethod === 'string' &&
          typeof value.controllerContent === 'string'
        );
      };

      // Create a map of method name to its content
      const methodsMap = new Map<string, string>();
      baseMethodsFolder.children
        .filter((item): item is IFile => item.type === 'file')
        .forEach((file) => {
          try {
            const yamlContent: unknown = parse(file.content);
            if (isBaseMethodYAML(yamlContent)) {
              // Check if we're processing BaseInterface.php by looking at the loop content
              if (loopContent.includes('{{repositoryMethod}}')) {
                // For interface, use the raw repositoryMethod but process any methodName placeholders in it
                const processedMethod = replacePlaceholders(
                  yamlContent.repositoryMethod,
                  {
                    methodName: yamlContent.methodName,
                  },
                );

                const methodContent = replacePlaceholders(loopContent, {
                  repositoryMethod: processedMethod,
                });
                methodsMap.set(yamlContent.methodName, methodContent);
              } else {
                // For regular controller methods, process as before
                const processedContent = replacePlaceholders(
                  yamlContent.controllerContent,
                  {
                    methodName: yamlContent.methodName,
                  },
                );

                const methodContent = replacePlaceholders(loopContent, {
                  controllerMethod: yamlContent.controllerMethod,
                  controllerContent: processedContent,
                });

                methodsMap.set(yamlContent.methodName, methodContent);
              }
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
        return replacePlaceholders(String(loopContent).trim(), replacements);
      })
      .join('\n    '); // Add proper indentation for PHP files
  });
};

const createFileContent = (
  options: ICommandOptions,
  table?: ISchemaInfo,
  fileName?: string,
): string => {
  // If no template is specified but filename ends with .php, use it as template
  const template =
    options.template ??
    (fileName?.endsWith('.php') === true ? fileName : undefined);

  if (typeof template === 'string' && template.length > 0) {
    if (table) {
      const replacements = getReplacementsForTable(table);
      let templateContent = loadTemplateContent(template);

      // Clean up template content
      templateContent = templateContent.replace(/^\s*\n/, ''); // Remove leading empty line

      const processedContent = replacePlaceholders(
        processLoopTables(templateContent),
        {
          ...replacements,
          modelSpecificRoutes: options.modelSpecificRoutes ?? '',
          baseRoutesForController: options.baseRoutesForController ?? '',
        },
      );
      return processedContent.trim();
    }
    const templateContent = loadTemplateContent(template);
    if (templateContent) {
      return processLoopTables(templateContent).trim();
    }
  }

  const metadata: string[] = [];
  const conditions = options.conditions;
  if (conditions !== undefined && conditions.length > 0) {
    metadata.push(`@conditions: ${conditions.join(',')}`);
  }

  return metadata.length > 0 ? metadata.join('\n') : '';
};

const replacePlaceholders = (
  text: string,
  replacements: Record<string, string>,
): string => {
  // Handle the placeholders with new $_..._$ syntax
  return text.replace(
    /\$_([^_]+)_\$|\{\{([^}]+)\}\}/g,
    (_, placeholder1: string | undefined, placeholder2: string | undefined) => {
      const key = (placeholder2 ?? placeholder1 ?? '').trim();
      if (key.length === 0) {
        return '';
      }
      if (!(key in replacements)) {
        console.warn(`No replacement found for placeholder: ${String(key)}`);
        return key;
      }
      return replacements[key];
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

  const files = masterSchema.map((table) => {
    const replacements = getReplacementsForTable(table);
    const processedName = replacePlaceholders(fileName, replacements);

    let content = '';
    if (templateContent.length > 0) {
      content = replacePlaceholders(processLoopTables(templateContent), {
        ...replacements,
        modelSpecificRoutes: options.modelSpecificRoutes ?? '',
        baseRoutesForController: options.baseRoutesForController ?? '',
      });
    } else {
      content = `@table: ${table.tableName}`;
    }

    return {
      type: 'file',
      name: processedName,
      content: content.trim(),
    };
  });

  // Filter out any empty files
  return files.filter((file): file is IFile => file.content.length > 0);
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
      if (conditions && conditions.length > 0 && !checkConditions(conditions)) {
        return [];
      }

      const replacements = getReplacementsForTable(table);
      const processedName = replacePlaceholders(command, replacements);

      return [
        {
          type: 'file',
          name: processedName.replace(/[()]/g, ''),
          content: createFileContent(options, table, processedName),
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
      return [
        {
          type: 'file',
          name: node,
          content: replacePlaceholders(
            processLoopTables(templateContent),
            replacements,
          ).trim(),
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

const processYamlNode = (node: unknown): IStructure => {
  if (typeof node === 'string') {
    if (node.startsWith('CREATE_FILE(')) {
      const { command, options } = parseCommand(node.slice(12, -1));

      // Skip file if conditions are not met
      const conditions = options.conditions;
      if (conditions && conditions.length > 0 && !checkConditions(conditions)) {
        return [];
      }

      return [
        {
          type: 'file',
          name: command.replace(/[()]/g, ''),
          content: createFileContent(options, undefined, command),
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
      return [
        {
          type: 'file',
          name: node,
          content: processLoopTables(templateContent).trim(),
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

export const buildProjectFiles = (yamlContent: string): IStructure => {
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
