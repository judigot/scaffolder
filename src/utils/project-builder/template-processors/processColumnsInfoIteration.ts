import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
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
import {
  isRecord,
  flattenData,
} from '@/utils/project-builder/utils/dataSourceUtils.ts';

/**
 * Resolves a value from nested object using a path array
 * e.g., ["typeMappings", "string", "postgresql"] → dataSource.typeMappings.string.postgresql
 */
const resolveNestedValue = (
  dataSource: DataContext,
  pathParts: string[],
): string | undefined => {
  let current: unknown = dataSource;

  for (const part of pathParts) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[part];
  }

  return typeof current === 'string' ? current : undefined;
};

/**
 * Parses a JavaScript-like property access expression into path parts
 * Supports: obj.prop, obj[var], obj.prop[var], obj[var].prop, obj[var1][var2]
 * Returns array of { value: string, isDynamic: boolean }
 */
const parsePropertyAccess = (
  expression: string,
): { value: string; isDynamic: boolean }[] => {
  const parts: { value: string; isDynamic: boolean }[] = [];
  let i = 0;

  while (i < expression.length) {
    // Skip leading dot
    if (expression[i] === '.') {
      i++;
      continue;
    }

    // Bracket notation: [varName]
    if (expression[i] === '[') {
      const endBracket = expression.indexOf(']', i);
      if (endBracket === -1) {
        break;
      }
      const varName = expression.slice(i + 1, endBracket);
      parts.push({ value: varName, isDynamic: true });
      i = endBracket + 1;
      continue;
    }

    // Dot notation: find next dot or bracket
    const nextDot = expression.indexOf('.', i);
    const nextBracket = expression.indexOf('[', i);
    let end: number;

    if (nextDot === -1 && nextBracket === -1) {
      end = expression.length;
    } else if (nextDot === -1) {
      end = nextBracket;
    } else if (nextBracket === -1) {
      end = nextDot;
    } else {
      end = Math.min(nextDot, nextBracket);
    }

    const propName = expression.slice(i, end);
    if (propName) {
      parts.push({ value: propName, isDynamic: false });
    }
    i = end;
  }

  return parts;
};

/**
 * Evaluates a single property access expression
 * e.g., "typeMappings[data_type][dbType]" or "typeMappings.string.postgresql"
 */
const evaluateExpression = (
  expression: string,
  replacements: Record<string, string>,
  dataSource: DataContext,
): string | undefined => {
  const parts = parsePropertyAccess(expression);
  if (parts.length === 0) {
    return undefined;
  }

  // Resolve each part to its actual value
  const resolvedPath: string[] = [];
  for (const part of parts) {
    if (part.isDynamic) {
      // Look up variable value from replacements
      if (!(part.value in replacements)) {
        return undefined; // Variable not found
      }
      resolvedPath.push(replacements[part.value]);
    } else {
      resolvedPath.push(part.value);
    }
  }

  return resolveNestedValue(dataSource, resolvedPath);
};

/**
 * Process a single dynamic lookup expression
 */
const processSingleDynamicExpression = (
  content: string,
  replacements: Record<string, string>,
  dataSource: DataContext,
  originalMatch: string,
): string => {
  const trimmedContent = content.trim();

  // Check if this is a JavaScript-like property access (contains . or [)
  if (!trimmedContent.includes('.') && !trimmedContent.includes('[')) {
    // Not a property access, return original for other processors
    return originalMatch;
  }

  // Handle fallback operator ||
  if (trimmedContent.includes('||')) {
    const expressions = trimmedContent.split('||').map((e) => e.trim());
    for (const expr of expressions) {
      const result = evaluateExpression(expr, replacements, dataSource);
      if (result !== undefined && result !== '') {
        return result;
      }
    }
    return ''; // All expressions failed
  }

  // Single expression
  const result = evaluateExpression(trimmedContent, replacements, dataSource);
  if (result !== undefined) {
    return result;
  }

  // Return original if not resolved (might be handled by other processors)
  return originalMatch;
};

/**
 * Process JavaScript-like dynamic lookups in template
 * Supports both {{...}} (legacy) and <@@>...</@@> (new) syntax
 * Supports:
 * - Dot notation: {{typeMappings.string.postgresql}} or <@@>typeMappings.string.postgresql</@@>
 * - Bracket notation: {{typeMappings[data_type][dbType]}} or <@@>typeMappings[data_type][dbType]</@@>
 * - Mixed: {{typeMappings.string[dbType]}} or {{typeMappings[data_type].postgresql}}
 * - Fallback with ||: {{typeMappings[value][dbType] || typeMappings[data_type][dbType]}}
 */
const processDynamicLookup = (
  template: string,
  replacements: Record<string, string>,
  dataSource?: DataContext,
): string => {
  if (!dataSource) {
    return template;
  }

  // First, process <@@>expression</@@> (new syntax)
  let result = template.replace(
    /<@@>([^<]+)<\/@@>/g,
    (match, content: string) =>
      processSingleDynamicExpression(content, replacements, dataSource, match),
  );

  // Then, process {{expression}} (legacy syntax)
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, content: string) =>
    processSingleDynamicExpression(content, replacements, dataSource, match),
  );

  return result;
};

// Legacy support for old syntax: {{[var1].[var2]}}, {{staticKey.[var]}}, {{[var].staticKey}}
const processLegacyDynamicLookup = (
  template: string,
  replacements: Record<string, string>,
  dataSource?: DataContext,
): string => {
  if (!dataSource) {
    return template;
  }

  const bothDynamicRegex = /\{\{\[([^\]]+)\]\.\[([^\]]+)\]\}\}/g;
  let result = template.replace(
    bothDynamicRegex,
    (_match, var1: string, var2: string) => {
      const key1 = replacements[var1] ?? var1;
      const key2 = replacements[var2] ?? var2;

      const typeData = dataSource[key1];
      if (isRecord(typeData) && typeof typeData[key2] === 'string') {
        return typeData[key2];
      }

      return '';
    },
  );

  const staticKeyDynamicTargetRegex =
    /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\.\[([^\]]+)\]\}\}/g;
  result = result.replace(
    staticKeyDynamicTargetRegex,
    (_match, staticKey: string, dynamicVar: string) => {
      const key2 = replacements[dynamicVar] ?? dynamicVar;

      const typeData = dataSource[staticKey];
      if (isRecord(typeData) && typeof typeData[key2] === 'string') {
        return typeData[key2];
      }

      return '';
    },
  );

  const dynamicKeyStaticTargetRegex =
    /\{\{\[([^\]]+)\]\.([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  result = result.replace(
    dynamicKeyStaticTargetRegex,
    (_match, dynamicVar: string, staticTarget: string) => {
      const key1 = replacements[dynamicVar] ?? dynamicVar;

      const typeData = dataSource[key1];
      if (isRecord(typeData) && typeof typeData[staticTarget] === 'string') {
        return typeData[staticTarget];
      }

      return '';
    },
  );

  return result;
};

const flattenDataSource = (
  dataSource?: DataContext,
): Record<string, string> => {
  if (!dataSource) {
    return {};
  }

  return flattenData(dataSource);
};

export const processColumnsInfoIteration = (
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
): string => {
  const dbType =
    formData && typeof formData.dbType === 'string' ? formData.dbType : '';

  const dataSourceReplacements = flattenDataSource(dataSource);

  const results: string[] = [];

  for (const column of tableObj.columnsInfo) {
    // Build replacements early so we can use them for filtering
    const caseFormats = changeCase(column.column_name);
    const columnReplacements: Record<string, string> = {
      ...dataSourceReplacements,
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
      data_type: column.data_type,
      dbType,
      is_nullable: column.is_nullable,
      column_default: column.column_default ?? '',
      is_primary_key: column.primary_key === true ? 'true' : 'false',
      is_unique: column.unique === true ? 'true' : 'false',
      foreign_table: column.foreign_key?.foreign_table_name ?? '',
      foreign_column: column.foreign_key?.foreign_column_name ?? '',
      has_foreign_key: column.foreign_key !== undefined ? 'true' : 'false',
    };

    // Apply filter condition if provided
    if (
      filterCondition !== undefined &&
      filterCondition !== '' &&
      !evaluateCondition(filterCondition, columnReplacements)
    ) {
      continue;
    }

    // Extend with additional case formats and namespaced keys
    const replacements: Record<string, string> = {
      ...columnReplacements,
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
      columnNameCamelCase: caseFormats.camelCase,
      // Verbose namespaced keys (explicit source)
      'column.name': column.column_name,
      'column.value': column.column_name,
      'column.data_type': column.data_type,
      'column.is_nullable': column.is_nullable,
      'column.column_default': column.column_default ?? '',
      'column.is_primary_key': column.primary_key === true ? 'true' : 'false',
      'column.is_unique': column.unique === true ? 'true' : 'false',
      'column.foreign_table': column.foreign_key?.foreign_table_name ?? '',
      'column.foreign_column': column.foreign_key?.foreign_column_name ?? '',
      'column.has_foreign_key':
        column.foreign_key !== undefined ? 'true' : 'false',
      'formData.dbType': dbType,
      ...getReplacementsForTable(tableObj, schemaInfoParsed),
    };

    // Process new JavaScript-like syntax first
    let processedTemplate = processDynamicLookup(
      templateStr,
      replacements,
      dataSource,
    );
    // Then process legacy syntax for backwards compatibility
    processedTemplate = processLegacyDynamicLookup(
      processedTemplate,
      replacements,
      dataSource,
    );

    processedTemplate = processHtmlIf(processedTemplate, replacements);

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

  const finalContent = results.join(separatorStr);
  return finalContent;
};
