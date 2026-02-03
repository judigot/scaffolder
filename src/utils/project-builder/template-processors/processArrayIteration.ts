import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo, ParsedJSONSchema } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import {
  processAtIf,
  processHtmlIf,
  evaluateCondition,
} from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import type { IFormStore } from '@/useFormStore.ts';
import type { DataContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import { flattenData } from '@/utils/project-builder/utils/dataSourceUtils.ts';

/**
 * Type guard for plain objects (not arrays)
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Build case format replacements for a string value
 */
const buildCaseReplacements = (
  value: string,
  prefix = 'value',
): Record<string, string> => {
  const caseFormats = changeCase(value);
  return {
    [prefix]: value,
    [`${prefix}Plural`]: caseFormats.plural,
    [`${prefix}Singular`]: caseFormats.singular,
    [`${prefix}TitleCase`]: caseFormats.titleCase,
    [`${prefix}SentenceCase`]: caseFormats.sentenceCase,
    [`${prefix}PhraseCase`]: caseFormats.phraseCase,
    [`${prefix}PascalCase`]: caseFormats.pascalCase,
    [`${prefix}CamelCase`]: caseFormats.camelCase,
    [`${prefix}KebabCase`]: caseFormats.kebabCase,
    [`${prefix}SnakeCase`]: caseFormats.snakeCase,
    [`${prefix}TitleCasePlural`]: caseFormats.titleCasePlural,
    [`${prefix}SentenceCasePlural`]: caseFormats.sentenceCasePlural,
    [`${prefix}PhraseCasePlural`]: caseFormats.phraseCasePlural,
    [`${prefix}PascalCasePlural`]: caseFormats.pascalCasePlural,
    [`${prefix}CamelCasePlural`]: caseFormats.camelCasePlural,
    [`${prefix}KebabCasePlural`]: caseFormats.kebabCasePlural,
    [`${prefix}SnakeCasePlural`]: caseFormats.snakeCasePlural,
    [`${prefix}TitleCaseSingular`]: caseFormats.titleCaseSingular,
    [`${prefix}SentenceCaseSingular`]: caseFormats.sentenceCaseSingular,
    [`${prefix}PhraseCaseSingular`]: caseFormats.phraseCaseSingular,
    [`${prefix}PascalCaseSingular`]: caseFormats.pascalCaseSingular,
    [`${prefix}CamelCaseSingular`]: caseFormats.camelCaseSingular,
    [`${prefix}KebabCaseSingular`]: caseFormats.kebabCaseSingular,
    [`${prefix}SnakeCaseSingular`]: caseFormats.snakeCaseSingular,
  };
};

/**
 * Get array from table by name, with support for computed arrays
 */
const getArrayFromTable = (
  arrayName: string,
  tableObj: ISchemaInfo,
  schemaInfoParsed: ISchemaInfoResult,
): unknown[] => {
  // Direct property access for known arrays
  switch (arrayName) {
    case 'columnsInfo':
      return tableObj.columnsInfo;
    case 'compositePrimaryKey':
      return tableObj.compositePrimaryKey ?? [];
    case 'requiredColumns':
      return schemaInfoParsed.getRequiredColumns(tableObj.tableName);
    case 'allColumns':
      return schemaInfoParsed.getAllColumns(tableObj.tableName);
    case 'foreignTables':
      return schemaInfoParsed.getForeignTables(tableObj.tableName);
    case 'hiddenColumns':
      return schemaInfoParsed.getHiddenColumns(tableObj.tableName);
    case 'childTables':
      return schemaInfoParsed.getChildTables(tableObj.tableName);
    default:
      // Unknown array names return empty array
      // Add new cases above for additional array support
      return [];
  }
};

/**
 * Build replacements for a single array item
 */
const buildItemReplacements = (
  item: unknown,
  index: number,
  arrayLength: number,
  arrayName: string,
  tableObj: ISchemaInfo,
  schemaInfoParsed: ISchemaInfoResult,
  formData?: IFormStore,
): Record<string, string> => {
  const dbType =
    formData && typeof formData.dbType === 'string' ? formData.dbType : '';

  // Base replacements available for all items
  const baseReplacements: Record<string, string> = {
    index: String(index),
    isFirst: index === 0 ? 'true' : 'false',
    isLast: index === arrayLength - 1 ? 'true' : 'false',
    arrayLength: String(arrayLength),
    dbType,
  };

  // Handle string items (e.g., compositePrimaryKey, requiredColumns)
  if (typeof item === 'string') {
    // For compositePrimaryKey, enrich with column info
    if (arrayName === 'compositePrimaryKey') {
      const columnsInfo = schemaInfoParsed.getColumnsInfo(tableObj.tableName);
      const columnInfo = columnsInfo.find((c) => c.column_name === item);
      const dataType = columnInfo?.data_type ?? 'string';

      return {
        ...baseReplacements,
        ...buildCaseReplacements(item, 'value'),
        data_type: dataType,
        isNumber: dataType === 'number' ? 'true' : 'false',
        isString: dataType === 'string' ? 'true' : 'false',
        isBoolean: dataType === 'boolean' ? 'true' : 'false',
        isDate: dataType === 'Date' ? 'true' : 'false',
        is_nullable: columnInfo?.is_nullable ?? 'YES',
        column_default: columnInfo?.column_default ?? '',
        foreign_table: columnInfo?.foreign_key?.foreign_table_name ?? '',
        foreign_column: columnInfo?.foreign_key?.foreign_column_name ?? '',
        has_foreign_key:
          columnInfo?.foreign_key !== undefined ? 'true' : 'false',
      };
    }

    // Generic string array
    return {
      ...baseReplacements,
      ...buildCaseReplacements(item, 'value'),
    };
  }

  // Handle object items (e.g., columnsInfo)
  if (typeof item === 'object' && item !== null) {
    const objReplacements: Record<string, string> = { ...baseReplacements };

    // Flatten object properties
    for (const [key, val] of Object.entries(item)) {
      if (val === null || val === undefined) {
        objReplacements[key] = '';
        continue;
      }

      if (typeof val === 'string') {
        objReplacements[key] = val;
        // Add namespaced version
        objReplacements[`item.${key}`] = val;
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        objReplacements[key] = String(val);
        objReplacements[`item.${key}`] = String(val);
      } else if (isPlainObject(val)) {
        // Handle nested objects (e.g., foreign_key)
        for (const nestedKey of Object.keys(val)) {
          const nestedVal = val[nestedKey];
          if (nestedVal !== null && nestedVal !== undefined) {
            const flatKey = `${key}_${nestedKey}`;
            let stringVal = '';
            if (
              typeof nestedVal === 'string' ||
              typeof nestedVal === 'number' ||
              typeof nestedVal === 'boolean'
            ) {
              stringVal = String(nestedVal);
            }
            objReplacements[flatKey] = stringVal;
            objReplacements[`item.${key}.${nestedKey}`] = stringVal;
          }
        }
      }
    }

    // Add case variants for common string fields
    const valueField =
      objReplacements.column_name ||
      objReplacements.name ||
      objReplacements.value;
    if (valueField) {
      Object.assign(
        objReplacements,
        buildCaseReplacements(valueField, 'value'),
      );
    }

    return objReplacements;
  }

  return baseReplacements;
};

/**
 * Generic array iteration processor
 * Handles any array property in ISchemaInfo
 *
 * Template variables available for all arrays:
 * - index: 0-based position
 * - isFirst: 'true' if first item
 * - isLast: 'true' if last item
 * - arrayLength: total items in array
 *
 * For string arrays:
 * - value, valueCamelCase, valuePascalCase, etc.
 *
 * For object arrays:
 * - All object properties flattened
 * - item.propertyName for namespaced access
 * - value case variants if column_name/name/value exists
 */
export const processArrayIteration = (
  arrayName: string,
  tableObj: ISchemaInfo,
  templateStr: string,
  separatorStr: string,
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  projectFilePath?: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  filterCondition?: string,
  _mockData?: ParsedJSONSchema,
): string => {
  const arr = getArrayFromTable(arrayName, tableObj, schemaInfoParsed);
  if (arr.length === 0) {
    return '';
  }

  const dataSourceReplacements = flattenData(dataSource ?? {});
  const tableReplacements = getReplacementsForTable(tableObj, schemaInfoParsed);
  const results: string[] = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const itemReplacements = buildItemReplacements(
      item,
      i,
      arr.length,
      arrayName,
      tableObj,
      schemaInfoParsed,
      formData,
    );

    const replacements: Record<string, string> = {
      ...dataSourceReplacements,
      ...tableReplacements,
      ...itemReplacements,
    };

    // Apply filter condition if provided
    if (
      filterCondition !== undefined &&
      filterCondition !== '' &&
      !evaluateCondition(filterCondition, replacements)
    ) {
      continue;
    }

    let processedTemplate = processHtmlIf(templateStr, replacements);
    processedTemplate = processAtIf(processedTemplate, replacements);

    const ctx = {
      userFiles,
      schemaInfo: [],
      schemaInfoParsed,
      projectYamlPath: projectFilePath ?? '',
      table: tableObj,
      formData,
      userMetadata,
    };

    const result = replacePlaceholders(
      processedTemplate,
      replacements,
      ctx,
      processedTemplate,
    );

    if (result.trim()) {
      results.push(result);
    }
  }

  return results.join(separatorStr);
};
