import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';

export const processColumnsInfoIteration = (
  tableObj: ISchemaInfo,
  templateStr: string,
  separatorStr: string,
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  projectFilePath?: string,
): string => {
  // Process each column individually
  const results: string[] = [];

  for (const column of tableObj.columnsInfo) {
    // Create a copy of the template for this column
    const processedTemplate = templateStr;

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
      ...getReplacementsForTable(tableObj, schemaInfoParsed),
    };

    // Replace placeholders
    const result = replacePlaceholders(
      processedTemplate,
      replacements,
      userFiles,
      schemaInfoParsed,
      tableObj,
      projectFilePath,
      processedTemplate,
    );
    if (result.trim()) {
      results.push(result);
    }
  }

  const finalContent = results.join(separatorStr);
  return finalContent;
};
