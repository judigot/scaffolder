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

export type TablePlaceholderKeys =
  | `tableName${Capitalize<TableCaseFormats>}`
  | `partnerTableName${Capitalize<TableCaseFormats>}`
  | `pivotTableName${Capitalize<TableCaseFormats>}`;

export type TableCaseFormatsObject = Record<TableCaseFormats, string>;

export type TableReplacements = Partial<Record<TablePlaceholderKeys, string>>;
