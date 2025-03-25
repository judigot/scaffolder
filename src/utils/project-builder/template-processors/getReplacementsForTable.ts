import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { Replacements } from '@/utils/project-builder/interfaces/interfaces.ts';

export const getReplacementsForTable = (
  table: ISchemaInfo,
  schemaInfoParsed: ISchemaInfoResult,
): Replacements => {
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
    'getPrimaryKey()': schemaInfoParsed.getPrimaryKey(table.tableName),
    'getRequiredColumns()': schemaInfoParsed.getRequiredColumns(
      table.tableName,
    ),
    'getAllColumns()': schemaInfoParsed.getAllColumns(table.tableName),
  };
};
