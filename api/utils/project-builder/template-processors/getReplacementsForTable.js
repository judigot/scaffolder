import { changeCase } from '../../../utils/common';
/**
 * Creates a helper function to support dynamic separators
 * @param arr Array to join
 * @returns A function that can be used to handle both direct and dynamic separators
 */
const createSeparatorHelper = (arr) => {
  return (templateKey) => {
    // Match patterns like: key(separator='value')
    const separatorMatch = /\(separator=['"](.+)['"]\)/.exec(templateKey);
    // Extract the separator value from the quotes if match exists
    let separator = separatorMatch?.[1];
    // Make sure separator exists and isn't an empty string
    if (separator !== undefined && separator !== '') {
      // Process special escape sequences
      separator = separator
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r');
      return arr.join(separator);
    }
    // Default case - return the array itself (which will be joined with commas by default)
    return arr.join(',');
  };
};
/**
 * Adds indexed access to arrays for template replacements
 */
const addIndexedAccess = (replacements, prefix, arr) => {
  for (let i = 0; i < arr.length; i++) {
    replacements[`${prefix}()[${String(i)}]`] = arr[i];
  }
};
export const getReplacementsForTable = (table, schemaInfoParsed) => {
  const tableName = table.tableName;
  const caseFormats = changeCase(tableName);
  // Create helper arrays
  const requiredColumns = schemaInfoParsed.getRequiredColumns(table.tableName);
  const allColumns = schemaInfoParsed.getAllColumns(table.tableName);
  const foreignTables = schemaInfoParsed.getForeignTables(table.tableName);
  const hiddenColumns = schemaInfoParsed.getHiddenColumns(table.tableName);
  const childTables = schemaInfoParsed.getChildTables(table.tableName);
  const columnInfoNames = schemaInfoParsed
    .getColumnsInfo(table.tableName)
    .map((col) => col.column_name);
  const hasOneRelationships =
    schemaInfoParsed.getRelationships(table.tableName).hasOne ?? [];
  const hasManyRelationships =
    schemaInfoParsed.getRelationships(table.tableName).hasMany ?? [];
  const belongsToRelationships =
    schemaInfoParsed.getRelationships(table.tableName).belongsTo ?? [];
  const belongsToManyRelationships =
    schemaInfoParsed.getRelationships(table.tableName).belongsToMany ?? [];
  // Create base replacements object
  const baseReplacements = {
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
    'getPrimaryKey()': schemaInfoParsed.getPrimaryKey(table.tableName),
    'getRequiredColumns()': requiredColumns,
    'getAllColumns()': allColumns,
    'getForeignTables()': foreignTables,
    'getHiddenColumns()': hiddenColumns,
    'getColumnsInfoNames()': columnInfoNames,
    'getChildTables()': childTables,
    'isPivot()': String(schemaInfoParsed.isPivot(table.tableName)),
    'hasOneRelationships()': hasOneRelationships,
    'hasManyRelationships()': hasManyRelationships,
    'belongsToRelationships()': belongsToRelationships,
    'belongsToManyRelationships()': belongsToManyRelationships,
  };
  // Add indexed access for all array properties
  const arrayProperties = [
    ['getRequiredColumns', requiredColumns],
    ['getAllColumns', allColumns],
    ['getForeignTables', foreignTables],
    ['getHiddenColumns', hiddenColumns],
    ['getColumnsInfoNames', columnInfoNames],
    ['getChildTables', childTables],
    ['hasOneRelationships', hasOneRelationships],
    ['hasManyRelationships', hasManyRelationships],
    ['belongsToRelationships', belongsToRelationships],
    ['belongsToManyRelationships', belongsToManyRelationships],
  ];
  // Add indexed access for all array properties
  arrayProperties.forEach(([prefix, arr]) => {
    addIndexedAccess(baseReplacements, prefix, arr);
  });
  // Create helper functions for separator patterns
  const helpers = {};
  arrayProperties.forEach(([prefix, arr]) => {
    helpers[prefix] = createSeparatorHelper(arr);
  });
  // Create proxy for dynamic property access
  const replacementsProxy = new Proxy(baseReplacements, {
    get: (target, prop) => {
      const key = String(prop);
      // Only process if it's a separator pattern
      if (!key.includes('separator=')) {
        return target[key];
      }
      // Extract the base property name
      const baseProperty = key.split('(')[0];
      // Return the result from the helper if it exists in our map
      return baseProperty in helpers ? helpers[baseProperty](key) : target[key];
    },
  });
  return replacementsProxy;
};
