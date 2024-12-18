export type TableCaseFormats =
  | 'plural'
  | 'singular'
  | 'titleCase'
  | 'sentenceCase'
  | 'phraseCase'
  | 'pascalCase'
  | 'camelCase'
  | 'kebabCase'
  | 'snakeCase'
  | 'titleCasePlural'
  | 'sentenceCasePlural'
  | 'phraseCasePlural'
  | 'pascalCasePlural'
  | 'camelCasePlural'
  | 'kebabCasePlural'
  | 'snakeCasePlural'
  | 'titleCaseSingular'
  | 'sentenceCaseSingular'
  | 'phraseCaseSingular'
  | 'pascalCaseSingular'
  | 'camelCaseSingular'
  | 'kebabCaseSingular'
  | 'snakeCaseSingular';

// Dynamically maps table context (tableName, partnerTableName, pivotTableName) to their case formats
export type TablePlaceholderKeys =
  | `tableName${Capitalize<TableCaseFormats>}`
  | `partnerTableName${Capitalize<TableCaseFormats>}`
  | `pivotTableName${Capitalize<TableCaseFormats>}`;

// Represents a collection of all case formats for a single table (or context)
export type TableCaseFormatsObject = Record<TableCaseFormats, string>;

// Represents all the placeholder replacements for the API
export type TableReplacements = Record<TablePlaceholderKeys, string>;
