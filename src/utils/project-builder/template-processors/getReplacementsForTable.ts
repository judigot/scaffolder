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

  // Get composite primary key info
  const compositePrimaryKey = schemaInfoParsed.getCompositePrimaryKey(
    table.tableName,
  );
  const compositePrimaryKeyCamelCase = compositePrimaryKey.map(
    (col) => changeCase(col).camelCase,
  );
  const hasCompositePK = schemaInfoParsed.hasCompositePrimaryKey(
    table.tableName,
  );

  // Get primary key data type
  const columnsInfo = schemaInfoParsed.getColumnsInfo(table.tableName);
  const primaryKeyColumn = hasCompositePK
    ? columnsInfo.find((col) => col.column_name === compositePrimaryKey[0])
    : columnsInfo.find((col) => col.primary_key === true);
  const rawPkDataType = primaryKeyColumn?.data_type ?? '';
  // Schema uses normalized types ('string', 'number', 'Date', 'boolean')
  const primaryKeyDataType = rawPkDataType === 'string' ? 'string' : 'number';

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
    primaryKeyDataType,
    'getRequiredColumns()': requiredColumns,
    'getAllColumns()': allColumns,
    'getForeignTables()': foreignTables,
    'getHiddenColumns()': hiddenColumns,
    'getColumnsInfoNames()': columnInfoNames,
    'getChildTables()': childTables,
    'isPivot()': String(schemaInfoParsed.isPivot(table.tableName)),
    // Composite primary key support
    'hasCompositePrimaryKey()': String(hasCompositePK),
    'getCompositePrimaryKey()': compositePrimaryKey,
    'getCompositePrimaryKeyCamelCase()': compositePrimaryKeyCamelCase,
    // Pre-formatted for Drizzle: table.col1, table.col2
    'getCompositePrimaryKeyDrizzle()': compositePrimaryKeyCamelCase
      .map((col) => `table.${col}`)
      .join(', '),
    // Pre-formatted for SQL: "col1", "col2"
    'getCompositePrimaryKeySQL()': compositePrimaryKey
      .map((col) => `"${col}"`)
      .join(', '),
    // Pre-formatted route params: /:orderId/:productId
    'getCompositePrimaryKeyRouteParams()': compositePrimaryKeyCamelCase
      .map((col) => `/:${col}`)
      .join(''),
    // Pre-formatted param extraction for route handlers (with type conversion)
    'getCompositePrimaryKeyParamExtraction()': compositePrimaryKey
      .map((colName) => {
        const col = columnsInfo.find((c) => c.column_name === colName);
        const camelCaseName = changeCase(colName).camelCase;
        const isNumber = col?.data_type === 'number';
        return isNumber
          ? `  const ${camelCaseName} = Number(c.req.param('${camelCaseName}'));`
          : `  const ${camelCaseName} = c.req.param('${camelCaseName}');`;
      })
      .join('\n'),
    // Pre-formatted where clause: and(eq(table.col1, col1), eq(table.col2, col2))
    'getCompositePrimaryKeyWhereClause()': hasCompositePK
      ? `and(${compositePrimaryKeyCamelCase.map((col) => `eq(${caseFormats.camelCase}.${col}, ${col})`).join(', ')})`
      : '',
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
    ['getCompositePrimaryKey', compositePrimaryKey],
    ['getCompositePrimaryKeyCamelCase', compositePrimaryKeyCamelCase],
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
