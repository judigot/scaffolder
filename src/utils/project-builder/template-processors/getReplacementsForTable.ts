import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import type { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';
import { getReplacementsForAuth } from '@/utils/project-builder/template-processors/getReplacementsForAuth.ts';

/**
 * Creates a helper function to support dynamic separators
 * @param arr Array to join
 * @returns A function that can be used to handle both direct and dynamic separators
 */
const createSeparatorHelper = (arr: string[]): ((key: string) => string) => {
  return (templateKey: string): string => {
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
 * Maps a base key to its corresponding helper function
 */
type SeparatorHelpers = Record<string, (key: string) => string>;

/**
 * Adds indexed access to arrays for template replacements
 */
const addIndexedAccess = (
  replacements: Replacements,
  prefix: string,
  arr: string[],
): void => {
  for (let i = 0; i < arr.length; i++) {
    replacements[`${prefix}()[${String(i)}]`] = arr[i];
  }
};

export const getReplacementsForTable = (
  table: ISchemaInfo,
  schemaInfoParsed: ISchemaInfoResult,
  tableIndex?: number,
  totalTables?: number,
): Replacements => {
  const tableName = table.tableName;
  const caseFormats = changeCase(tableName);

  // Create helper arrays
  const requiredColumns = schemaInfoParsed.getRequiredColumns(table.tableName);
  const allColumns = schemaInfoParsed.getAllColumns(table.tableName);
  const foreignTables = schemaInfoParsed.getForeignTables(table.tableName);
  const hiddenColumns = schemaInfoParsed.getHiddenColumns(table.tableName);
  const childTables = schemaInfoParsed.getChildTables(table.tableName);

  // Auth resource detection
  const isAuthResource = table.isAuthResource === true;
  const ownerField = table.ownerField ?? '';
  const ownerFieldCamelCase = ownerField ? changeCase(ownerField).camelCase : '';

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

  // Get primary key and its camelCase version
  const primaryKey = schemaInfoParsed.getPrimaryKey(table.tableName);
  const primaryKeyCamelCase = primaryKey
    ? changeCase(primaryKey).camelCase
    : '';

  // Generate sample payloads for API testing
  // @deprecated Use DSL operators (CONTAINS, ENDS_WITH, STARTS_WITH, --filter) instead.
  // These functions will be removed in a future version.
  // Example filter: <@@LOOP@@ data="columnsInfo" filter="is_primary_key NOT EQUAL 'true' AND NOT value ENDS_WITH '_at'">
  const columnsInfo = schemaInfoParsed.getColumnsInfo(table.tableName);
  const foreignTablesList = schemaInfoParsed.getForeignTables(table.tableName);
  const generatePayload = (isUpdate: boolean): string => {
    const payload: Record<string, unknown> = {};
    for (const col of columnsInfo) {
      // Skip primary key
      if (col.column_name === primaryKey) {
        continue;
      }
      // Skip auto-generated timestamp columns
      if (
        col.column_name.endsWith('_at') ||
        col.column_name === 'created_at' ||
        col.column_name === 'updated_at' ||
        col.column_name === 'deleted_at'
      ) {
        continue;
      }

      const camelName = changeCase(col.column_name).camelCase;
      const prefix = isUpdate ? 'Updated ' : 'Test ';

      // Check if this is a foreign key column (ends with _id and references another table)
      const isForeignKey =
        col.column_name.endsWith('_id') &&
        foreignTablesList.some(
          (ft) =>
            col.column_name === `${ft}_id` ||
            col.column_name === `${changeCase(ft).snakeCase}_id`,
        );

      // Generate sample value based on type
      if (
        isForeignKey ||
        col.data_type.includes('int') ||
        col.data_type === 'serial'
      ) {
        payload[camelName] = 1;
      } else if (col.data_type.includes('bool')) {
        payload[camelName] = true;
      } else if (
        col.data_type.includes('numeric') ||
        col.data_type.includes('decimal') ||
        col.data_type.includes('float') ||
        col.data_type.includes('double')
      ) {
        payload[camelName] = 9.99;
      } else {
        payload[camelName] = `${prefix}${camelName}`;
      }
    }
    return JSON.stringify(payload);
  };

  // Get auth-related replacements (project-level)
  const authReplacements = getReplacementsForAuth(schemaInfoParsed.schema);

  // Create base replacements object
  const baseReplacements: Replacements = {
    ...authReplacements,
    tableNamePascalCase: caseFormats.pascalCase,
    tableNamePascalCaseSingular: caseFormats.pascalCaseSingular,
    tableNameKebabCasePlural: caseFormats.kebabCasePlural,
    tableNamePlural: caseFormats.plural,
    tableNameSnakeCaseSingular: caseFormats.snakeCaseSingular,
    tableNameSnakeCasePlural: caseFormats.snakeCasePlural,
    tableName,
    tableNameSingular: caseFormats.singular,
    tableNameTitleCase: caseFormats.titleCase,
    tableNameSentenceCase: caseFormats.sentenceCase,
    tableNamePhraseCase: caseFormats.phraseCase,
    tableNameCamelCase: caseFormats.camelCase,
    tableNameKebabCase: caseFormats.kebabCase,
    tableNameSnakeCase: caseFormats.snakeCase,
    tableNameUpperCase: caseFormats.snakeCase.toUpperCase(),
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
    'getPrimaryKey()': primaryKey,
    'getPrimaryKeyCamelCase()': primaryKeyCamelCase,
    primaryKey: primaryKeyCamelCase,
    createPayload: generatePayload(false),
    updatePayload: generatePayload(true),
    'getRequiredColumns()': requiredColumns,
    'getAllColumns()': allColumns,
    'getForeignTables()': foreignTables,
    'getHiddenColumns()': hiddenColumns,
    'getColumnsInfoNames()': columnInfoNames,
    'getChildTables()': childTables,
    'isPivot()': String(schemaInfoParsed.isPivot(table.tableName)),
    // Auth resource template variables
    isAuthResource: String(isAuthResource),
    'isAuthResource()': String(isAuthResource),
    ownerField,
    ownerFieldCamelCase,
    'hasOneRelationships()': hasOneRelationships,
    'hasManyRelationships()': hasManyRelationships,
    'belongsToRelationships()': belongsToRelationships,
    'belongsToManyRelationships()': belongsToManyRelationships,
    // Index and timestamp support (for function calls and property access)
    tableIndex: tableIndex !== undefined ? String(tableIndex) : '0',
    totalTables: totalTables !== undefined ? String(totalTables) : '0',
    // Default index and timestamp as properties (0-based index, ISO timestamp)
    index: tableIndex !== undefined ? String(tableIndex) : '0',
    timestamp: new Date().toISOString(),
  };

  // Add indexed access for all array properties
  const arrayProperties: [string, string[]][] = [
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
  const helpers: SeparatorHelpers = {};
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
