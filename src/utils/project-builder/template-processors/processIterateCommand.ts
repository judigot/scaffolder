import type { IFolder, IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo, ParsedJSONSchema } from '@/interfaces/interfaces.ts';
import { changeCase } from '@/utils/common.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import type { IFormStore } from '@/useFormStore.ts';
import type { DataContext } from '@/utils/project-builder/interfaces/interfaces.ts';
import { filterViewTables } from '@/utils/project-builder/utils/filterViewTables.ts';
import {
  LOOP_COMMAND_REGEX,
  LOOP_TABLES_REGEX,
  LOOP_TABLES_REVERSED_REGEX,
  LOOP_DATA_SOURCES_START_REGEX,
  TEMPLATE_MATCH_REGEX,
  SEPARATOR_MATCH_REGEX,
  FILTER_MATCH_REGEX,
  IGNORE_MATCH_REGEX,
  INCLUDE_FILES_MATCH_REGEX,
  EXCLUDE_FILES_MATCH_REGEX,
  REMOVE_DUPLICATES_REGEX,
  USE_CONSTANT_REGEX,
  FOLDER_PATH_REGEX,
  RECURSIVE_WILDCARD_REGEX,
  TEMPLATE_ACTIONS,
} from '@/utils/project-builder/constants/templateActions.ts';
import {
  findFilesMatchingGlob,
  createDataContextReplacements,
} from '@/utils/project-builder/utils/dataSourceUtils.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import {
  loadConstant,
  loadConstantFromPath,
} from '@/utils/project-builder/template-processors/loadConstant.ts';
import { processColumnsInfoIteration } from '@/utils/project-builder/template-processors/processColumnsInfoIteration.ts';
import { processFileBasedTemplate } from '@/utils/project-builder/template-processors/fileBased.ts';
import {
  findFoldersWithWildcard,
  buildFolderPath,
} from '@/utils/project-builder/template-processors/processRecursiveWildcard.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { parse } from 'yaml';

/**
 * Evaluate a condition expression against replacements.
 * Supports operators: EQUALS, NOT EQUAL, CONTAINS, STARTS_WITH, ENDS_WITH
 * Also supports compound conditions with AND/OR.
 *
 * @param condition - The condition string (e.g., "varName EQUALS 'value'")
 * @param replacements - The replacement values to evaluate against
 * @returns boolean result of the condition evaluation
 */
export const evaluateCondition = (
  condition: string,
  replacements: Record<string, string | string[]>,
): boolean => {
  const trimmedCondition = condition.trim();

  // Handle compound AND conditions (split and evaluate each)
  if (trimmedCondition.includes(' AND ')) {
    const parts = trimmedCondition.split(/\s+AND\s+/);
    return parts.every((part) => evaluateCondition(part, replacements));
  }

  // Handle compound OR conditions
  if (trimmedCondition.includes(' OR ')) {
    const parts = trimmedCondition.split(/\s+OR\s+/);
    return parts.some((part) => evaluateCondition(part, replacements));
  }

  // Handle NOT prefix (but not "NOT EQUAL" or "NOT NULL" or "NOT CONTAINS")
  if (
    trimmedCondition.startsWith('NOT ') &&
    !trimmedCondition.includes(' NOT EQUAL ') &&
    !trimmedCondition.includes(' IS NOT NULL') &&
    !trimmedCondition.includes(' NOT CONTAINS ')
  ) {
    return !evaluateCondition(trimmedCondition.slice(4), replacements);
  }

  // EXISTS condition: varName EXISTS
  const existsMatch = /^(\S+)\s+EXISTS\s*$/.exec(trimmedCondition);
  if (existsMatch) {
    const [, varName] = existsMatch;
    const value = varName in replacements ? replacements[varName] : undefined;
    return value !== undefined && value !== '' && value !== 'false';
  }

  // IS TRUE condition: varName IS TRUE
  const isTrueMatch = /^(\S+)\s+IS\s+TRUE\s*$/i.exec(trimmedCondition);
  if (isTrueMatch) {
    const [, varName] = isTrueMatch;
    const value = varName in replacements ? replacements[varName] : undefined;
    return value === 'true';
  }

  // IS NOT NULL condition: varName IS NOT NULL
  const isNotNullMatch = /^(\S+)\s+IS\s+NOT\s+NULL\s*$/i.exec(trimmedCondition);
  if (isNotNullMatch) {
    const [, varName] = isNotNullMatch;
    const value = varName in replacements ? replacements[varName] : undefined;
    return value !== undefined && value !== '';
  }

  // NOT CONTAINS condition: varName NOT CONTAINS 'substring' or unquoted
  const notContainsMatch =
    /^(\S+)\s+NOT\s+CONTAINS\s+(?:['"]([^'"]*)['"]\s*|(\S+)\s*)$/.exec(
      trimmedCondition,
    );
  if (notContainsMatch) {
    const [, varName, quotedValue, unquotedValue] = notContainsMatch;
    // One of quotedValue or unquotedValue must exist if regex matched
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const substring = quotedValue ?? unquotedValue ?? '';
    const actualValue =
      typeof replacements[varName] === 'string' ? replacements[varName] : '';
    return !actualValue.includes(substring);
  }

  // EQUALS condition: varName EQUALS 'value' or varName EQUALS value (unquoted)
  const equalsMatch =
    /^(\S+)\s+EQUALS\s+(?:['"]([^'"]*)['"]\s*|(\S+)\s*)$/.exec(
      trimmedCondition,
    );
  if (equalsMatch) {
    const [, varName, quotedValue, unquotedValue] = equalsMatch;
    // One of quotedValue or unquotedValue must exist if regex matched
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const expectedValue = quotedValue ?? unquotedValue ?? '';
    const actualValue =
      typeof replacements[varName] === 'string' ? replacements[varName] : '';
    return actualValue === expectedValue;
  }

  // NOT EQUAL condition: varName NOT EQUAL 'value' or unquoted
  const notEqualMatch =
    /^(\S+)\s+NOT\s+EQUAL\s+(?:['"]([^'"]*)['"]\s*|(\S+)\s*)$/.exec(
      trimmedCondition,
    );
  if (notEqualMatch) {
    const [, varName, quotedValue, unquotedValue] = notEqualMatch;
    // One of quotedValue or unquotedValue must exist if regex matched
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const expectedValue = quotedValue ?? unquotedValue ?? '';
    const actualValue =
      typeof replacements[varName] === 'string' ? replacements[varName] : '';
    return actualValue !== expectedValue;
  }

  // CONTAINS condition: varName CONTAINS 'substring' or unquoted
  const containsMatch =
    /^(\S+)\s+CONTAINS\s+(?:['"]([^'"]*)['"]\s*|(\S+)\s*)$/.exec(
      trimmedCondition,
    );
  if (containsMatch) {
    const [, varName, quotedValue, unquotedValue] = containsMatch;
    // One of quotedValue or unquotedValue must exist if regex matched
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const substring = quotedValue ?? unquotedValue ?? '';
    const actualValue =
      typeof replacements[varName] === 'string' ? replacements[varName] : '';
    return actualValue.includes(substring);
  }

  // STARTS_WITH condition: varName STARTS_WITH 'prefix' or unquoted
  const startsWithMatch =
    /^(\S+)\s+STARTS_WITH\s+(?:['"]([^'"]*)['"]\s*|(\S+)\s*)$/.exec(
      trimmedCondition,
    );
  if (startsWithMatch) {
    const [, varName, quotedValue, unquotedValue] = startsWithMatch;
    // One of quotedValue or unquotedValue must exist if regex matched
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const prefix = quotedValue ?? unquotedValue ?? '';
    const actualValue =
      typeof replacements[varName] === 'string' ? replacements[varName] : '';
    return actualValue.startsWith(prefix);
  }

  // ENDS_WITH condition: varName ENDS_WITH 'suffix' or unquoted
  const endsWithMatch =
    /^(\S+)\s+ENDS_WITH\s+(?:['"]([^'"]*)['"]\s*|(\S+)\s*)$/.exec(
      trimmedCondition,
    );
  if (endsWithMatch) {
    const [, varName, quotedValue, unquotedValue] = endsWithMatch;
    // One of quotedValue or unquotedValue must exist if regex matched
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const suffix = quotedValue ?? unquotedValue ?? '';
    const actualValue =
      typeof replacements[varName] === 'string' ? replacements[varName] : '';
    return actualValue.endsWith(suffix);
  }

  // If no pattern matched, return false
  return false;
};

/**
 * Find a folder in the file structure given a path
 */
const findFolderByPath = (
  path: string,
  userFiles: IStructure,
): IFolder | undefined => {
  const pathParts = path.split('/').filter(Boolean);
  let currentFolder: IFolder | undefined;

  // Start from root
  const store = userFiles;

  // If no path parts, return undefined as we're at root level
  if (pathParts.length === 0) {
    return undefined;
  }

  // Find the first level folder
  currentFolder = store.find(
    (item): item is IFolder =>
      item.type === 'folder' && item.name === pathParts[0],
  );

  // Navigate through the rest of the path
  for (let i = 1; i < pathParts.length && currentFolder; i++) {
    currentFolder = currentFolder.children.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === pathParts[i],
    );
  }

  return currentFolder;
};

/**
 * Check if a folder contains any YAML files
 */
const folderContainsYamlFiles = (folder: IFolder): boolean => {
  return folder.children.some(
    (item) =>
      item.type === 'file' &&
      (item.name.endsWith('.yml') || item.name.endsWith('.yaml')),
  );
};

/**
 * Process block-based LOOP syntax: [[LOOP(property)]]...content...[[/LOOP --separator="..."]]
 * This syntax avoids escaping issues with nested templates.
 * Uses balanced bracket matching to handle nested LOOPs.
 */
const processBlockLoops = (
  content: string,
  table: ISchemaInfo,
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  // Match opening [[LOOP(property)]] - but not tables or tablesReversed (those are handled separately)
  const openRegex = /\[\[\s*LOOP\(([^)]+)\)\s*\]\]/g;
  let result = content;

  // Collect all matches with their balanced closing tags
  const matches: {
    start: number;
    end: number;
    property: string;
    templateContent: string;
    closingOptions: string;
  }[] = [];

  let match: RegExpExecArray | null = openRegex.exec(content);
  while (match !== null) {
    const property = match[1];
    // Skip tables and tablesReversed - they're handled by processBlockLoopTables/Reversed
    if (property === 'tables' || property === 'tablesReversed') {
      match = openRegex.exec(content);
      continue;
    }

    const openEnd = match.index + match[0].length;
    const closeInfo = findAtLoopEnd(content, openEnd);

    if (closeInfo) {
      matches.push({
        start: match.index,
        end: closeInfo.endIndex,
        property,
        templateContent: content.slice(
          openEnd,
          closeInfo.endIndex - closeInfo.closingOptions.length - 9,
        ),
        closingOptions: closeInfo.closingOptions,
      });
    }
    match = openRegex.exec(content);
  }

  // Process matches in reverse order to avoid index shifting
  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end, property, templateContent, closingOptions } =
      matches[i];

    // Parse separator from closing tag options
    const separatorMatch = /--separator="((?:[^"\\]|\\.)*)"/.exec(
      closingOptions,
    );
    const separator = separatorMatch
      ? separatorMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
      : '';

    let processed = '';

    if (property === 'columnsInfo') {
      processed = processColumnsInfoIteration(
        table,
        templateContent.trim(),
        separator,
        schemaInfoParsed,
        userFiles,
        undefined,
        formData,
        userMetadata,
        dataSource,
        undefined,
        mockData,
      );
    } else {
      // For other properties, use processIterateCommand with inline format
      const escapedTemplate = templateContent
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');

      const escapedSeparator = separator
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');

      processed = processIterateCommand(
        `${TEMPLATE_ACTIONS.LOOP}(${property}) --template="${escapedTemplate}" --separator="${escapedSeparator}"`,
        table,
        schemaInfoParsed,
        userFiles,
        undefined,
        formData,
        userMetadata,
      );
    }

    result = result.slice(0, start) + processed + result.slice(end);
  }

  return result;
};

const processInnerLoops = (
  content: string,
  table: ISchemaInfo,
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  const result = processBlockLoops(
    content,
    table,
    schemaInfoParsed,
    userFiles,
    formData,
    userMetadata,
    dataSource,
    mockData,
  );

  // Then process inline LOOPs (legacy syntax)
  const iterateRegex = new RegExp(
    `\\[\\[\\s*${TEMPLATE_ACTIONS.LOOP}\\(([^\\[\\]]*?(?:\\{\\{[^}]*\\}\\})?[^\\[\\]]*)\\)([^\\]]*)\\]\\]`,
    'g',
  );

  return result.replace(
    iterateRegex,
    (fullMatch: string, propertyPathsStr: string, options: string) => {
      const whitespace = /^\s*/.exec(fullMatch)?.[0] ?? '';
      const cmdResult = processIterateCommand(
        `${TEMPLATE_ACTIONS.LOOP}(${propertyPathsStr})${options}`,
        table,
        schemaInfoParsed,
        userFiles,
        undefined,
        formData,
        userMetadata,
      );
      return cmdResult ? whitespace + cmdResult : '';
    },
  );
};

/**
 * Find matching @/LOOP for a @LOOP(...) block, handling nested blocks
 * New experimental syntax that doesn't conflict with [[ ]] brackets
 */
const findAtLoopEnd = (
  content: string,
  startIndex: number,
): { endIndex: number; closingOptions: string } | null => {
  let depth = 1;
  let i = startIndex;

  while (i < content.length && depth > 0) {
    // Check for opening @LOOP(
    if (content.slice(i, i + 6) === '@LOOP(') {
      // Find the closing ) of this opening tag
      const closeParen = content.indexOf(')', i + 6);
      if (closeParen !== -1) {
        depth++;
        i = closeParen + 1;
      } else {
        i++;
      }
    }
    // Check for closing @/LOOP
    else if (content.slice(i, i + 6) === '@/LOOP') {
      depth--;
      if (depth === 0) {
        // Find the end of the line or next @LOOP
        let endIndex = i + 6;
        let closingOptions = '';

        // Check for options like --separator="..."
        const restOfLine = content.slice(i + 6);
        const optionsMatch = /^([^\n@]*)/.exec(restOfLine);
        if (optionsMatch) {
          closingOptions = optionsMatch[1];
          endIndex = i + 6 + optionsMatch[1].length;
        }

        // Skip trailing newline if present
        if (content[endIndex] === '\n') {
          endIndex++;
        }

        return { endIndex, closingOptions };
      }
      i += 6;
    } else {
      i++;
    }
  }

  return null;
};

/**
 * Process @LOOP(tables) experimental syntax
 */
const processAtLoopTables = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  const openRegex = /@LOOP\(tables\)\n?/g;
  let result = content;

  const matches: {
    start: number;
    end: number;
    templateContent: string;
    closingOptions: string;
  }[] = [];

  let match: RegExpExecArray | null = openRegex.exec(content);
  while (match !== null) {
    const openEnd = match.index + match[0].length;
    const closeInfo = findAtLoopEnd(content, openEnd);

    if (closeInfo) {
      matches.push({
        start: match.index,
        end: closeInfo.endIndex,
        templateContent: content.slice(
          openEnd,
          closeInfo.endIndex -
            closeInfo.closingOptions.length -
            6 -
            (content[closeInfo.endIndex - 1] === '\n' ? 1 : 0),
        ),
        closingOptions: closeInfo.closingOptions,
      });
    }
    match = openRegex.exec(content);
  }

  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end, templateContent, closingOptions } = matches[i];

    const separatorMatch = /--separator="((?:[^"\\]|\\.)*)"/.exec(
      closingOptions,
    );
    const separator = separatorMatch
      ? separatorMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
      : '\n';

    const processed = processAtLoopTablesTemplate(
      templateContent,
      separator,
      schemaInfo,
      schemaInfoParsed,
      userFiles,
      formData,
      userMetadata,
      dataSource,
      mockData,
    );

    result = result.slice(0, start) + processed + result.slice(end);
  }

  return result;
};

/**
 * Process @LOOP(tablesReversed) experimental syntax
 */
const processAtLoopTablesReversed = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  const openRegex = /@LOOP\(tablesReversed\)\n?/g;
  let result = content;
  /* Filter out view tables using centralized function */
  const filteredSchemaInfo = filterViewTables(schemaInfo, schemaInfoParsed);
  const reversedSchema = [...filteredSchemaInfo].reverse();

  const matches: {
    start: number;
    end: number;
    templateContent: string;
    closingOptions: string;
  }[] = [];

  let match: RegExpExecArray | null = openRegex.exec(content);
  while (match !== null) {
    const openEnd = match.index + match[0].length;
    const closeInfo = findAtLoopEnd(content, openEnd);

    if (closeInfo) {
      matches.push({
        start: match.index,
        end: closeInfo.endIndex,
        templateContent: content.slice(
          openEnd,
          closeInfo.endIndex -
            closeInfo.closingOptions.length -
            6 -
            (content[closeInfo.endIndex - 1] === '\n' ? 1 : 0),
        ),
        closingOptions: closeInfo.closingOptions,
      });
    }
    match = openRegex.exec(content);
  }

  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end, templateContent, closingOptions } = matches[i];

    const separatorMatch = /--separator="((?:[^"\\]|\\.)*)"/.exec(
      closingOptions,
    );
    const separator = separatorMatch
      ? separatorMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
      : '\n';

    const processed = processAtLoopTablesTemplate(
      templateContent,
      separator,
      reversedSchema,
      schemaInfoParsed,
      userFiles,
      formData,
      userMetadata,
      dataSource,
      mockData,
    );

    result = result.slice(0, start) + processed + result.slice(end);
  }

  return result;
};

/**
 * Parse attributes from HTML-like tag: <@@LOOP@@ type="tables" separator="\n">
 */
const parseHtmlTagAttributes = (
  attributesStr: string,
): Record<string, string> => {
  const attrs: Record<string, string> = {};
  // Match attribute="value" or attribute='value'
  const attrRegex = /(\w+)="([^"]*)"|(\w+)='([^']*)'/g;

  let match: RegExpExecArray | null = attrRegex.exec(attributesStr);
  while (match !== null) {
    const name = match[1] || match[3];
    const value = match[2] || match[4];
    if (name) {
      attrs[name] = value;
    }
    match = attrRegex.exec(attributesStr);
  }

  return attrs;
};

/**
 * Validate that template has balanced opening/closing tags.
 * Throws an error if tags are unbalanced, preventing silent failures.
 */
const validateHtmlTemplateTags = (content: string, context?: string): void => {
  const ifOpens = (content.match(/<@@IF@@/g) ?? []).length;
  const ifCloses = (content.match(/<\/@@IF@@>/g) ?? []).length;
  const loopOpens = (content.match(/<@@LOOP@@/g) ?? []).length;
  const loopCloses = (content.match(/<\/@@LOOP@@>/g) ?? []).length;

  const errors: string[] = [];

  if (ifOpens !== ifCloses) {
    errors.push(
      `<@@IF@@>: ${String(ifOpens)} opens, ${String(ifCloses)} closes`,
    );
  }
  if (loopOpens !== loopCloses) {
    errors.push(
      `<@@LOOP@@>: ${String(loopOpens)} opens, ${String(loopCloses)} closes`,
    );
  }

  if (errors.length > 0) {
    const contextInfo =
      context !== undefined && context !== '' ? ` in "${context}"` : '';
    throw new Error(
      `Unbalanced template tags${contextInfo}:\n  ${errors.join('\n  ')}`,
    );
  }
};

/**
 * Find matching </@@LOOP@@> for a <@@LOOP@@> block, handling nested blocks
 */
const findHtmlLoopEnd = (
  content: string,
  startIndex: number,
): { endIndex: number } | null => {
  let depth = 1;
  let i = startIndex;

  while (i < content.length && depth > 0) {
    // Check for opening <@@LOOP@@ (9 characters)
    if (content.slice(i, i + 9) === '<@@LOOP@@') {
      // Find the closing > of this opening tag
      const closeTag = content.indexOf('>', i + 9);
      if (closeTag !== -1) {
        depth++;
        i = closeTag + 1;
      } else {
        i++;
      }
    }
    // Check for closing </@@LOOP@@> (11 characters)
    else if (content.slice(i, i + 11) === '</@@LOOP@@>') {
      depth--;
      if (depth === 0) {
        return { endIndex: i + 11 };
      }
      i += 11;
    } else {
      i++;
    }
  }

  return null;
};

/**
 * Find matching </@@IF@@> for a <@@IF@@> block, handling nested blocks
 */
const findHtmlIfEnd = (
  content: string,
  startIndex: number,
): { endIndex: number } | null => {
  let depth = 1;
  let i = startIndex;

  while (i < content.length && depth > 0) {
    // Check for opening <@@IF@@ (7 characters)
    if (content.slice(i, i + 7) === '<@@IF@@') {
      // Find the closing > of this opening tag
      const closeTag = content.indexOf('>', i + 7);
      if (closeTag !== -1) {
        depth++;
        i = closeTag + 1;
      } else {
        i++;
      }
    }
    // Check for <@@ELSE@@> (10 characters, doesn't affect depth, just skip it)
    else if (content.slice(i, i + 10) === '<@@ELSE@@>') {
      i += 10;
    }
    // Check for closing </@@IF@@> (9 characters)
    else if (content.slice(i, i + 9) === '</@@IF@@>') {
      depth--;
      if (depth === 0) {
        return { endIndex: i + 9 };
      }
      i += 9;
    } else {
      i++;
    }
  }

  return null;
};

/**
 * Process HTML-like <@@LOOP@@> syntax
 */
const processHtmlLoop = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  // Validate template tags before processing
  validateHtmlTemplateTags(content, 'HTML LOOP');

  // Match <@@LOOP@@ data="tables" separator="\n">
  const openRegex = /<@@LOOP@@([^>]*)>/g;
  let result = content;
  let iterations = 0;
  const maxIterations = 100;

  // Process recursively until no more HTML LOOP tags are found
  while (iterations < maxIterations) {
    iterations++;
    const matches: {
      start: number;
      end: number;
      type: string;
      separator: string;
      templateContent: string;
    }[] = [];

    // Reset regex lastIndex for new search
    openRegex.lastIndex = 0;

    let match: RegExpExecArray | null = openRegex.exec(result);
    while (match !== null) {
      const attributesStr = match[1];
      const attrs = parseHtmlTagAttributes(attributesStr);
      const data = attrs.data || '';
      const separator = attrs.separator
        ? attrs.separator
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
        : '\n';

      const openEnd = match.index + match[0].length;
      const closeInfo = findHtmlLoopEnd(result, openEnd);

      if (closeInfo && data) {
        matches.push({
          start: match.index,
          end: closeInfo.endIndex,
          type: data,
          separator,
          templateContent: result.slice(openEnd, closeInfo.endIndex - 11), // -11 for </@@LOOP@@>
        });
      }
      match = openRegex.exec(result);
    }

    if (matches.length === 0) {
      break;
    }

    // Process matches in reverse order
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, type, separator, templateContent } = matches[i];

      let processed = '';

      if (type === 'tables') {
        /* Filter out view tables using centralized function */
        const filteredSchemaInfo = filterViewTables(
          schemaInfo,
          schemaInfoParsed,
        );
        processed = processAtLoopTablesTemplate(
          templateContent.replace(/^\n/, '').trimEnd(),
          separator,
          filteredSchemaInfo,
          schemaInfoParsed,
          userFiles,
          formData,
          userMetadata,
          dataSource,
          mockData,
        );
      } else if (type === 'tablesReversed') {
        /* Filter out view tables using centralized function */
        const filteredSchemaInfo = filterViewTables(
          schemaInfo,
          schemaInfoParsed,
        );
        const reversedSchema = [...filteredSchemaInfo].reverse();
        processed = processAtLoopTablesTemplate(
          templateContent.replace(/^\n/, '').trimEnd(),
          separator,
          reversedSchema,
          schemaInfoParsed,
          userFiles,
          formData,
          userMetadata,
          dataSource,
          mockData,
        );
      } else if (type === 'columnsInfo') {
        // Skip columnsInfo at top level - it will be processed per-table in processAtLoopTablesTemplate
        continue;
      }

      result = result.slice(0, start) + processed + result.slice(end);
    }
  }

  return result;
};

/**
 * Process HTML-like <@@IF@@> syntax
 */
export const processHtmlIf = (
  content: string,
  replacements: Record<string, string | string[]>,
): string => {
  // Match <@@IF@@ condition="var EQUALS 'value'">
  const openRegex = /<@@IF@@([^>]*)>/g;
  let result = content;
  let iterations = 0;
  const maxIterations = 100;

  let match: RegExpExecArray | null = openRegex.exec(result);
  while (match !== null && iterations < maxIterations) {
    iterations++;

    const attributesStr = match[1];
    const attrs = parseHtmlTagAttributes(attributesStr);
    const condition = attrs.condition || '';

    const openEnd = match.index + match[0].length;
    const closeInfo = findHtmlIfEnd(result, openEnd);

    if (!closeInfo) {
      // This should not happen if validateHtmlTemplateTags was called first
      throw new Error(
        `Unbalanced <@@IF@@> tag: could not find matching </@@IF@@> for condition "${condition}"`,
      );
    }

    // Extract content between <@@IF@@> and </@@IF@@>
    let ifContent = result.slice(openEnd, closeInfo.endIndex - 9); // -9 for </@@IF@@>

    // Check for <@@ELSE@@> at the same nesting level
    let elseContent = '';
    let elseIdx = -1;
    let depth = 0;
    for (let i = 0; i < ifContent.length; i++) {
      if (ifContent.slice(i, i + 7) === '<@@IF@@') {
        depth++;
        const closeTag = ifContent.indexOf('>', i + 7);
        if (closeTag !== -1) {
          i = closeTag;
        }
      } else if (ifContent.slice(i, i + 9) === '</@@IF@@>') {
        depth--;
        i += 8;
      } else if (ifContent.slice(i, i + 10) === '<@@ELSE@@>' && depth === 0) {
        elseIdx = i + 10;
        break;
      }
    }

    if (elseIdx !== -1) {
      elseContent = ifContent.slice(elseIdx);
      // Strip </@@ELSE@@> closing tag if present (11 characters)
      if (elseContent.endsWith('</@@ELSE@@>')) {
        elseContent = elseContent.slice(0, -11);
      }
      ifContent = ifContent.slice(0, elseIdx - 10);
    }

    // Evaluate condition using the unified evaluator
    const conditionResult = evaluateCondition(condition, replacements);

    // Replace the <@@IF@@> block with the appropriate content
    const replacement = conditionResult ? ifContent : elseContent;
    result =
      result.slice(0, match.index) +
      replacement +
      result.slice(closeInfo.endIndex);

    // Reset regex to start from beginning since we modified the string
    openRegex.lastIndex = 0;
    match = openRegex.exec(result);
  }

  return result;
};

/**
 * Find matching @/IF for a @IF(...) block
 */
const findAtIfEnd = (
  content: string,
  startIndex: number,
): { endIndex: number } | null => {
  let depth = 1;
  let i = startIndex;

  while (i < content.length && depth > 0) {
    // Check for nested @IF( - must have ( to start a new block
    if (content.slice(i, i + 4) === '@IF(' && i + 4 < content.length) {
      // Find the closing ) of this condition
      const closeParen = content.indexOf(')', i + 4);
      if (closeParen !== -1) {
        depth++;
        i = closeParen + 1;
        // Skip newline after @IF(...)
        if (content[i] === '\n') {
          i++;
        }
      } else {
        i++;
      }
    }
    // Check for @ELSE (doesn't affect depth, just skip it)
    else if (content.slice(i, i + 5) === '@ELSE') {
      i += 5;
      if (content[i] === '\n') {
        i++;
      }
    }
    // Check for closing @/IF
    else if (content.slice(i, i + 4) === '@/IF') {
      depth--;
      if (depth === 0) {
        let endIndex = i + 4;
        // Skip trailing newline if present
        if (content[endIndex] === '\n') {
          endIndex++;
        }
        return { endIndex };
      }
      i += 4;
      if (content[i] === '\n') {
        i++;
      }
    } else {
      i++;
    }
  }
  return null;
};

/**
 * Process @IF experimental syntax
 * Supports: @IF(var EQUALS 'value'), @IF(var NOT EQUAL 'value')
 * Also supports @ELSE within @IF blocks
 */
export const processAtIf = (
  content: string,
  replacements: Record<string, string | string[]>,
): string => {
  let result = content;
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops

  // Keep processing until no more @IF patterns are found
  while (result.includes('@IF(') && iterations < maxIterations) {
    iterations++;

    // Find the first @IF(
    const ifStart = result.indexOf('@IF(');
    if (ifStart === -1) {
      break;
    }

    // Find the closing ) of the condition
    const conditionEnd = result.indexOf(')', ifStart + 4);
    if (conditionEnd === -1) {
      break;
    }

    const condition = result.slice(ifStart + 4, conditionEnd);
    let openEnd = conditionEnd + 1;
    if (result[openEnd] === '\n') {
      openEnd++;
    }

    const closeInfo = findAtIfEnd(result, openEnd);
    if (!closeInfo) {
      break;
    }

    // Extract content between @IF(...) and @/IF
    // The content ends 4 characters before endIndex (for "@/IF")
    // We need to find where the @/IF starts
    const closingTagStart =
      closeInfo.endIndex - (result[closeInfo.endIndex - 1] === '\n' ? 5 : 4);
    let ifContent = result.slice(openEnd, closingTagStart);

    // Check for @ELSE at the same nesting level
    let elseContent = '';
    let elseIdx = -1;
    let depth = 0;
    for (let i = 0; i < ifContent.length; i++) {
      if (ifContent.slice(i, i + 4) === '@IF(') {
        depth++;
        const closeParen = ifContent.indexOf(')', i + 4);
        if (closeParen !== -1) {
          i = closeParen;
        }
      } else if (ifContent.slice(i, i + 4) === '@/IF') {
        depth--;
        i += 3;
      } else if (ifContent.slice(i, i + 5) === '@ELSE' && depth === 0) {
        elseIdx = i;
        break;
      }
    }

    if (elseIdx !== -1) {
      elseContent = ifContent.slice(elseIdx + 5);
      if (elseContent.startsWith('\n')) {
        elseContent = elseContent.slice(1);
      }
      ifContent = ifContent.slice(0, elseIdx);
      if (ifContent.endsWith('\n')) {
        ifContent = ifContent.slice(0, -1);
      }
    }

    // Evaluate condition using the unified evaluator
    const conditionResult = evaluateCondition(condition, replacements);

    // Replace the @IF block with the appropriate content
    const replacement = conditionResult ? ifContent : elseContent;
    result =
      result.slice(0, ifStart) + replacement + result.slice(closeInfo.endIndex);
  }

  return result;
};

export const processHtmlLoopColumnsInfo = (
  content: string,
  table: ISchemaInfo,
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  // Validate template tags before processing
  validateHtmlTemplateTags(
    content,
    `columnsInfo loop for table "${table.tableName}"`,
  );

  const openRegex = /<@@LOOP@@([^>]*)>/g;
  let result = content;
  let iterations = 0;
  const maxIterations = 100;

  // Process recursively until no more HTML LOOP tags are found
  while (iterations < maxIterations) {
    iterations++;
    const matches: {
      start: number;
      end: number;
      separator: string;
      filter: string;
      templateContent: string;
    }[] = [];

    // Reset regex lastIndex for new search
    openRegex.lastIndex = 0;

    let match: RegExpExecArray | null = openRegex.exec(result);
    while (match !== null) {
      const attributesStr = match[1];
      const attrs = parseHtmlTagAttributes(attributesStr);
      const data = attrs.data || '';

      if (data !== 'columnsInfo') {
        match = openRegex.exec(result);
        continue;
      }

      const separator = attrs.separator
        ? attrs.separator
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
        : '';

      const filter = 'filter' in attrs ? attrs.filter : '';

      const openEnd = match.index + match[0].length;
      const closeInfo = findHtmlLoopEnd(result, openEnd);

      if (closeInfo) {
        matches.push({
          start: match.index,
          end: closeInfo.endIndex,
          separator,
          filter,
          templateContent: result.slice(openEnd, closeInfo.endIndex - 11),
        });
      }
      match = openRegex.exec(result);
    }

    if (matches.length === 0) {
      break;
    }

    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, separator, filter, templateContent } = matches[i];

      const processed = processColumnsInfoIteration(
        table,
        templateContent.replace(/^\n/, '').trimEnd(),
        separator,
        schemaInfoParsed,
        userFiles,
        undefined,
        formData,
        userMetadata,
        dataSource,
        filter || undefined,
        mockData,
      );

      result = result.slice(0, start) + processed + result.slice(end);
    }
  }

  return result;
};

const processAtLoopColumnsInfo = (
  content: string,
  table: ISchemaInfo,
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  const openRegex = /@LOOP\(columnsInfo\)\n?/g;
  let result = content;

  const matches: {
    start: number;
    end: number;
    templateContent: string;
    closingOptions: string;
  }[] = [];

  let match: RegExpExecArray | null = openRegex.exec(content);
  while (match !== null) {
    const openEnd = match.index + match[0].length;
    const closeInfo = findAtLoopEnd(content, openEnd);

    if (closeInfo) {
      const closingTagStart =
        closeInfo.endIndex - closeInfo.closingOptions.length - 6;
      const hasTrailingNewline = content[closeInfo.endIndex - 1] === '\n';
      const templateEnd = closingTagStart - (hasTrailingNewline ? 1 : 0);

      matches.push({
        start: match.index,
        end: closeInfo.endIndex,
        templateContent: content.slice(openEnd, templateEnd),
        closingOptions: closeInfo.closingOptions,
      });
    }
    match = openRegex.exec(content);
  }

  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end, templateContent, closingOptions } = matches[i];

    const separatorMatch = /--separator="((?:[^"\\]|\\.)*)"/.exec(
      closingOptions,
    );
    const separator = separatorMatch
      ? separatorMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
      : '';

    const processed = processColumnsInfoIteration(
      table,
      templateContent,
      separator,
      schemaInfoParsed,
      userFiles,
      undefined,
      formData,
      userMetadata,
      dataSource,
      undefined,
      mockData,
    );

    result = result.slice(0, start) + processed + result.slice(end);
  }

  return result;
};

/**
 * Process template for each table using @LOOP syntax
 */
const processAtLoopTablesTemplate = (
  templateContent: string,
  separator: string,
  tables: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  return tables
    .map((table) => {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);

      // First process HTML-like <@@LOOP@@ data="columnsInfo">
      let processed = processHtmlLoopColumnsInfo(
        templateContent,
        table,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
        dataSource,
        mockData,
      );

      // Then process inner @LOOP(columnsInfo)
      processed = processAtLoopColumnsInfo(
        processed,
        table,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
        dataSource,
        mockData,
      );

      // Then replace placeholders
      const ctx = {
        userFiles,
        schemaInfo: tables,
        schemaInfoParsed,
        projectYamlPath: '',
        table,
        formData,
        userMetadata,
      };
      processed = replacePlaceholders(processed, replacements, ctx);

      return processed;
    })
    .join(separator);
};

/**
 * Process a template for each table in schemaInfo
 */
const processTablesTemplate = (
  templateContent: string,
  separator: string,
  tables: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
): string => {
  return tables
    .map((table) => {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);
      const ctx = {
        userFiles,
        schemaInfo: tables,
        schemaInfoParsed,
        projectYamlPath: '',
        table,
        formData,
        userMetadata,
      };
      let processed = replacePlaceholders(
        templateContent.trim(),
        replacements,
        ctx,
      );
      processed = processInnerLoops(
        processed,
        table,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );
      return processed;
    })
    .join(separator);
};

export const processLoopTables = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  /* Filter out view tables using centralized function */
  const filteredSchemaInfo = filterViewTables(schemaInfo, schemaInfoParsed);

  // First, process HTML-like <@@LOOP@@> syntax
  let result = processHtmlLoop(
    content,
    filteredSchemaInfo,
    schemaInfoParsed,
    userFiles,
    formData,
    userMetadata,
    dataSource,
    mockData,
  );

  // Then, process @LOOP(tables) experimental syntax
  result = processAtLoopTables(
    result,
    filteredSchemaInfo,
    schemaInfoParsed,
    userFiles,
    formData,
    userMetadata,
    dataSource,
    mockData,
  );

  // Then, process inline LOOP(tables) with --template="..."
  result = result.replace(
    LOOP_TABLES_REGEX,
    (_match: string, options: string) => {
      const templateMatch = TEMPLATE_MATCH_REGEX.exec(options);
      const separatorMatch = SEPARATOR_MATCH_REGEX.exec(options);

      if (!templateMatch) {
        return '';
      }

      const templateContent = templateMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\s/g, ' ')
        .replace(/\\"/g, '"');

      const separator = separatorMatch
        ? separatorMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\s/g, ' ')
            .replace(/\\"/g, '"')
        : '\n    ';

      return processTablesTemplate(
        templateContent,
        separator,
        filteredSchemaInfo,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );
    },
  );

  return result;
};

export const processLoopTablesReversed = (
  content: string,
  schemaInfo: ISchemaInfo[],
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
  dataSource?: DataContext,
  mockData?: ParsedJSONSchema,
): string => {
  /* Filter out view tables using centralized function */
  const filteredSchemaInfo = filterViewTables(schemaInfo, schemaInfoParsed);
  const reversedSchema = [...filteredSchemaInfo].reverse();

  // First, process HTML-like <@@LOOP@@> syntax
  let result = processHtmlLoop(
    content,
    filteredSchemaInfo,
    schemaInfoParsed,
    userFiles,
    formData,
    userMetadata,
    dataSource,
    mockData,
  );

  // Then, process @LOOP(tablesReversed) experimental syntax
  result = processAtLoopTablesReversed(
    result,
    filteredSchemaInfo,
    schemaInfoParsed,
    userFiles,
    formData,
    userMetadata,
    dataSource,
    mockData,
  );

  // Then, process inline LOOP(tablesReversed) with --template="..."
  result = result.replace(
    LOOP_TABLES_REVERSED_REGEX,
    (_match: string, options: string) => {
      const templateMatch = TEMPLATE_MATCH_REGEX.exec(options);
      const separatorMatch = SEPARATOR_MATCH_REGEX.exec(options);

      if (!templateMatch) {
        return '';
      }

      const templateContent = templateMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\s/g, ' ')
        .replace(/\\"/g, '"');

      const separator = separatorMatch
        ? separatorMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\s/g, ' ')
            .replace(/\\"/g, '"')
        : '\n    ';

      return processTablesTemplate(
        templateContent,
        separator,
        reversedSchema,
        schemaInfoParsed,
        userFiles,
        formData,
        userMetadata,
      );
    },
  );

  return result;
};

const findMatchingCloseBrackets = (
  content: string,
  startIndex: number,
): number => {
  let depth = 1;
  let i = startIndex;
  while (i < content.length && depth > 0) {
    if (content[i] === '[' && content[i + 1] === '[') {
      depth++;
      i += 2;
    } else if (content[i] === ']' && content[i + 1] === ']') {
      depth--;
      if (depth === 0) {
        return i;
      }
      i += 2;
    } else {
      i++;
    }
  }
  return -1;
};

const parseQuotedString = (
  str: string,
  startIndex: number,
): { value: string; endIndex: number } | null => {
  if (str[startIndex] !== '"') {
    return null;
  }

  let i = startIndex + 1;
  let result = '';
  let escaped = false;

  while (i < str.length) {
    const char = str[i];

    if (escaped) {
      if (char === 'n') {
        result += '\n';
      } else if (char === 't') {
        result += '\t';
      } else if (char === 's') {
        result += ' ';
      } else if (char === '"') {
        result += '"';
      } else if (char === '\\') {
        result += '\\';
      } else {
        result += `\\${char}`;
      }
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      return { value: result, endIndex: i + 1 };
    } else {
      result += char;
    }

    i++;
  }

  return null;
};

const parseLoopDataSourcesCommand = (
  commandContent: string,
): {
  dataSourcePattern: string;
  templateContent: string;
  separator: string;
} | null => {
  const firstSpaceIndex = commandContent.indexOf(' ');
  if (firstSpaceIndex === -1) {
    return null;
  }

  const dataSourcePattern = commandContent.substring(0, firstSpaceIndex).trim();
  const options = commandContent.substring(firstSpaceIndex);

  // Find --template="..." using manual parsing
  const templateFlag = '--template=';
  const templateIndex = options.indexOf(templateFlag);
  if (templateIndex === -1) {
    return null;
  }

  const templateStart = templateIndex + templateFlag.length;
  const templateResult = parseQuotedString(options, templateStart);
  if (!templateResult) {
    return null;
  }

  const templateContent = templateResult.value;

  // Find --separator="..." if present
  const separatorFlag = '--separator=';
  const separatorIndex = options.indexOf(
    separatorFlag,
    templateResult.endIndex,
  );
  let separator = '\n';
  if (separatorIndex !== -1) {
    const separatorStart = separatorIndex + separatorFlag.length;
    const separatorResult = parseQuotedString(options, separatorStart);
    if (separatorResult) {
      separator = separatorResult.value;
    }
  }

  return { dataSourcePattern, templateContent, separator };
};

export const processLoopDataSources = (
  content: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
): string => {
  let result = content;

  LOOP_DATA_SOURCES_START_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null =
    LOOP_DATA_SOURCES_START_REGEX.exec(result);
  while (match !== null) {
    const startIndex = match.index;
    const contentStartIndex = startIndex + match[0].length;

    const closeBracketIndex = findMatchingCloseBrackets(
      result,
      contentStartIndex,
    );
    if (closeBracketIndex === -1) {
      break;
    }

    const innerContent = result.substring(contentStartIndex, closeBracketIndex);
    const lastParenIndex = innerContent.lastIndexOf(')');
    if (lastParenIndex === -1) {
      break;
    }

    const commandContent = innerContent.substring(0, lastParenIndex);

    const parsed = parseLoopDataSourcesCommand(commandContent);

    if (!parsed) {
      LOOP_DATA_SOURCES_START_REGEX.lastIndex = contentStartIndex;
      continue;
    }

    const { dataSourcePattern, templateContent, separator } = parsed;

    const dataMatches = findFilesMatchingGlob(userFiles, dataSourcePattern);

    const replacement = dataMatches
      .map((dataMatch) => {
        const { augmentedData, replacements } = createDataContextReplacements(
          dataMatch.data,
          dataMatch.folderPath,
        );

        const ctx = {
          userFiles,
          schemaInfo: [],
          schemaInfoParsed,
          projectYamlPath: '',
          formData,
          userMetadata,
          dataContext: augmentedData,
        };

        return replacePlaceholders(
          templateContent.trim(),
          replacements,
          ctx,
          undefined,
          true, // Skip LOOP_DATA_SOURCES to prevent infinite recursion
        );
      })
      .join(separator);

    const fullMatchEnd = closeBracketIndex + 2;
    result =
      result.substring(0, startIndex) +
      replacement +
      result.substring(fullMatchEnd);

    LOOP_DATA_SOURCES_START_REGEX.lastIndex = startIndex + replacement.length;
    match = LOOP_DATA_SOURCES_START_REGEX.exec(result);
  }

  return result;
};

export const processIterateCommand = (
  command: string,
  table: ISchemaInfo | undefined,
  schemaInfoParsed: ISchemaInfoResult,
  userFiles: IStructure,
  projectFilePath?: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
): string => {
  // Extract the property path and options
  // Make the closing parenthesis optional and handle incomplete commands
  const match = LOOP_COMMAND_REGEX.exec(command);
  if (!match || !table) {
    return '';
  }

  const [, propertyPathsStr, options = ''] = match;

  // Parse options
  const templateMatch = TEMPLATE_MATCH_REGEX.exec(options);
  const separatorMatch = SEPARATOR_MATCH_REGEX.exec(options);
  const removeDuplicates = REMOVE_DUPLICATES_REGEX.test(options);
  const ignoreMatch = IGNORE_MATCH_REGEX.exec(options);
  const filterMatch = FILTER_MATCH_REGEX.exec(options);
  const includedFilesMatch = INCLUDE_FILES_MATCH_REGEX.exec(options);
  const excludedFilesMatch = EXCLUDE_FILES_MATCH_REGEX.exec(options);

  // Process escape sequences in template
  const template = templateMatch
    ? templateMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\s/g, ' ')
        .replace(/\\"/g, '"')
    : '{{value}}';

  // Use literal separator string and preserve spaces
  const separator = separatorMatch
    ? separatorMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\s/g, ' ')
        .replace(/\\"/g, '"')
    : '';

  // Parse include and exclude filters
  const includedFiles = includedFilesMatch
    ? includedFilesMatch[1].split(',').map((item) => item.trim())
    : [];

  const excludedFiles = excludedFilesMatch
    ? excludedFilesMatch[1].split(',').map((item) => item.trim())
    : [];

  // Parse ignore list with flexible whitespace and handle USE_CONSTANT
  /* Regex to match USE_CONSTANT(...) without brackets (for command options) */
  const USE_CONSTANT_OPTION_REGEX = /USE_CONSTANT\(([^)]+)\)/;

  const ignoreList = ignoreMatch
    ? ignoreMatch[1].split(',').flatMap((item) => {
        const trimmed = item.trim();
        /* Try USE_CONSTANT(...) without brackets first (for command options) */
        const constantMatch =
          USE_CONSTANT_OPTION_REGEX.exec(trimmed) ??
          USE_CONSTANT_REGEX.exec(trimmed);

        if (constantMatch) {
          const constantValue = constantMatch[1];
          /* Check if this is a file path (contains '/' or ends with '.yaml') */
          const isFilePath =
            constantValue.includes('/') || constantValue.endsWith('.yaml');

          if (isFilePath) {
            /* Load from file path (supports relative and absolute paths) */
            return loadConstantFromPath(
              constantValue,
              userFiles,
              schemaInfoParsed,
              table,
              projectFilePath,
              formData,
              userMetadata,
            );
          }

          /* Load from Constants folder (legacy behavior) */
          return loadConstant(
            constantValue,
            userFiles,
            schemaInfoParsed,
            table,
            projectFilePath,
            formData,
            userMetadata,
          );
        }
        // For non-constant values, still process any placeholders they might have
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const ignoreCtx = {
          userFiles,
          schemaInfo: [],
          schemaInfoParsed,
          projectYamlPath: projectFilePath ?? '',
          table,
          formData,
          userMetadata,
        };
        return replacePlaceholders(trimmed, replacements, ignoreCtx);
      })
    : [];

  // Helper function to check if a folder should be ignored based on its path
  const shouldIgnoreFolder = (folderPath: string): boolean => {
    // Check if the folder path matches any of the ignore patterns
    return ignoreList.some((ignorePath) => {
      if (typeof ignorePath !== 'string') {
        return false;
      }

      // Handle directory wildcards in ignore pattern
      if (ignorePath.endsWith('/**')) {
        // Remove the trailing /** for direct path prefix matching
        const pathPrefix = ignorePath.replace(/\/\*\*$/, '');
        return (
          folderPath === pathPrefix || folderPath.startsWith(`${pathPrefix}/`)
        );
      }

      // Handle exact directory matches
      if (ignorePath.startsWith('/')) {
        return (
          folderPath === ignorePath || folderPath.startsWith(`${ignorePath}/`)
        );
      }

      // For patterns, check if the folder path includes the pattern
      return folderPath.includes(ignorePath);
    });
  };

  // Check for recursive wildcard path
  const recursiveWildcardMatch =
    RECURSIVE_WILDCARD_REGEX.exec(propertyPathsStr);

  if (recursiveWildcardMatch) {
    // Get the wildcard pattern
    const [, wildcardPath] = recursiveWildcardMatch;

    // Process all matching folders using the wildcard pattern
    const matchingFolders = findFoldersWithWildcard(userFiles, wildcardPath);

    // Filter out folders that should be ignored
    const filteredFolders = matchingFolders.filter((folder) => {
      const fullPath = buildFolderPath(folder, userFiles);
      return !shouldIgnoreFolder(fullPath);
    });

    // For wildcard paths, check if any of the matching folders contain YAML files
    let shouldBeFileBased = false;

    if (filteredFolders.length > 0) {
      // If none of the folders contain YAML files, use file-based mode
      const anyFolderHasYaml = filteredFolders.some((folder) =>
        folderContainsYamlFiles(folder),
      );
      shouldBeFileBased = !anyFolderHasYaml;
    }

    if (shouldBeFileBased) {
      const results: string[] = [];

      for (const folder of filteredFolders) {
        // Construct the full path to this folder
        const fullPath = buildFolderPath(folder, userFiles);

        const processedTemplate = processFileBasedTemplate(
          fullPath,
          userFiles,
          schemaInfoParsed,
          table,
          template,
          includedFiles,
          excludedFiles,
          separator,
          projectFilePath,
          formData,
          userMetadata,
        );

        if (processedTemplate) {
          results.push(processedTemplate);
        }
      }

      return results.join('\n');
    }
    // For non-file-based approach, continue with normal processing
  }

  // For regular folder paths, check if we should auto-detect file-based mode
  const folderPathMatch = FOLDER_PATH_REGEX.exec(propertyPathsStr);
  if (folderPathMatch) {
    const [, folderPath] = folderPathMatch;

    // Check if this folder should be ignored
    if (shouldIgnoreFolder(`/${folderPath}`)) {
      return ''; // Skip this folder
    }

    const targetFolder = findFolderByPath(folderPath, userFiles);

    let shouldBeFileBased = false;

    if (targetFolder) {
      // If the folder doesn't contain any YAML files, use file-based mode
      shouldBeFileBased = !folderContainsYamlFiles(targetFolder);
    }

    if (shouldBeFileBased) {
      return processFileBasedTemplate(
        propertyPathsStr,
        userFiles,
        schemaInfoParsed,
        table,
        template,
        includedFiles,
        excludedFiles,
        separator,
        projectFilePath,
        formData,
        userMetadata,
      );
    }
  }

  // Parse filter list with flexible whitespace and handle USE_CONSTANT
  const filterList = filterMatch
    ? filterMatch[1].split(',').map((item) => {
        const trimmed = item.trim();
        const constantMatch = USE_CONSTANT_REGEX.exec(trimmed);
        if (constantMatch) {
          // Get raw values from constant file and return as an array
          return loadConstant(
            constantMatch[1],
            userFiles,
            schemaInfoParsed,
            table,
          );
        }
        // For non-constant values, still process any placeholders they might have
        const replacements = getReplacementsForTable(table, schemaInfoParsed);
        const filterCtx = {
          userFiles,
          schemaInfo: [],
          schemaInfoParsed,
          projectYamlPath: '',
          table,
          formData,
          userMetadata,
        };
        return replacePlaceholders(trimmed, replacements, filterCtx);
      })
    : [];

  // Helper function to join array with separator between elements
  const joinWithSeparator = (arr: string[]): string => {
    if (arr.length === 0) {
      return '';
    }
    if (arr.length === 1) {
      return arr[0];
    }
    return arr.slice(0, -1).join(separator) + separator + arr.slice(-1)[0];
  };

  // Helper function to filter ignored values
  const filterIgnored = (values: string[]): string[] => {
    if (ignoreList.length === 0) {
      return values;
    }
    return values.filter((value) => !ignoreList.includes(value));
  };

  // Helper function to apply filter
  const applyFilter = (values: string[]): string[] => {
    if (filterList.length === 0) {
      return values;
    }

    // Flatten the filter list to handle both direct values and arrays from USE_CONSTANT
    const flattenedFilterList = filterList.flatMap((filterPattern) =>
      Array.isArray(filterPattern) ? filterPattern : [filterPattern],
    );

    return values.filter((value) => flattenedFilterList.includes(value));
  };

  // Special handling for LOOP(tables) command
  if (propertyPathsStr.trim() === 'tables') {
    // This is where we integrate processLoopTables functionality
    // It doesn't actually use the current table, but rather processes all tables
    // The tables need to be provided via a parameter
    return ''; // This is a placeholder, will be handled by the external processLoopTables function
  }

  // Split property paths and clean whitespace
  const propertyPaths = propertyPathsStr.split(',').map((p) => {
    let path = p.trim();
    // If it's a function call with missing closing parenthesis, add it
    if (path.startsWith('{{') && path.includes('(') && !path.includes(')')) {
      path = `${path})}}`;
    }
    // If it's a function call with missing closing brace, add it
    if (path.startsWith('{{') && !path.endsWith('}}')) {
      path = `${path}}}`;
    }
    return path;
  });

  // Special handling for columnsInfo iteration
  if (propertyPaths.includes('columnsInfo')) {
    return processColumnsInfoIteration(
      table,
      template,
      separator,
      schemaInfoParsed,
      userFiles,
      projectFilePath,
      formData,
      userMetadata,
    );
  }

  // For other types of iterations, use the original logic
  // Collect all values from all properties
  const allValues: string[] = [];

  // Special handling for user folder paths (starting with /)
  // Create a map to store all placeholder values for each method/value
  const allPlaceholderValues = new Map<string, Record<string, string>>();

  // Track filenames separately to apply include/exclude filters
  const fileNameMap = new Map<string, string>();

  for (const path of propertyPaths) {
    const folderMatch = FOLDER_PATH_REGEX.exec(path);
    if (folderMatch) {
      // If we've already processed this path as a recursive wildcard, skip it
      if (recursiveWildcardMatch && path === propertyPathsStr) {
        // we need to collect files from all matching folders
        const [, wildcardPath] = recursiveWildcardMatch;
        const matchingFolders = findFoldersWithWildcard(
          userFiles,
          wildcardPath,
        );

        // Filter out folders that should be ignored
        const filteredFolders = matchingFolders.filter((folder) => {
          const fullPath = buildFolderPath(folder, userFiles);
          return !shouldIgnoreFolder(fullPath);
        });

        // Process files from each matching folder
        for (const folder of filteredFolders) {
          processFilesInFolder(
            folder,
            includedFiles,
            excludedFiles,
            allValues,
            allPlaceholderValues,
            fileNameMap,
          );
        }

        continue; // Skip the standard folder processing below
      }

      const [, folderPath] = folderMatch;

      // Check if this folder should be ignored
      if (shouldIgnoreFolder(`/${folderPath}`)) {
        continue; // Skip this folder
      }

      // Navigate through the folder structure
      const pathParts = folderPath.split('/').filter(Boolean);
      let currentFolder: IFolder | undefined;

      // Start from root
      const store = userFiles;

      // Find the target folder
      if (pathParts.length > 0) {
        // Find the first level folder
        currentFolder = store.find(
          (item): item is IFolder =>
            item.type === 'folder' && item.name === pathParts[0],
        );

        // Navigate through the rest of the path
        for (let i = 1; i < pathParts.length && currentFolder; i++) {
          currentFolder = currentFolder.children.find(
            (item): item is IFolder =>
              item.type === 'folder' && item.name === pathParts[i],
          );
        }
      }

      if (currentFolder) {
        // Process all files in the folder
        processFilesInFolder(
          currentFolder,
          includedFiles,
          excludedFiles,
          allValues,
          allPlaceholderValues,
          fileNameMap,
        );
      }
    }
  }

  for (const propertyPath of propertyPaths) {
    // Check if the entire propertyPath is a function call
    if (propertyPath.startsWith('{{') && propertyPath.endsWith('}}')) {
      const functionCall = propertyPath.slice(2, -2).trim();
      // Extract just the function name without any parentheses
      const functionName = functionCall.replace(/\([^)]*\)?$/, '');

      switch (functionName) {
        case 'getAllColumns': {
          const values = schemaInfoParsed.getAllColumns(table.tableName);
          allValues.push(...values);
          continue;
        }
        case 'getRequiredColumns': {
          const values = schemaInfoParsed.getRequiredColumns(table.tableName);
          allValues.push(...values);
          continue;
        }
        case 'getPrimaryKey': {
          const value = schemaInfoParsed.getPrimaryKey(table.tableName);
          if (value) {
            allValues.push(value);
          }
          continue;
        }
      }
      continue; // Skip unknown function calls
    }

    // Handle direct property access
    const cleanPath = propertyPath.replace(/[{}]/g, '').trim();

    switch (cleanPath) {
      case 'hasMany': {
        const values = table.hasMany ?? [];
        allValues.push(...values);
        break;
      }
      case 'belongsToMany': {
        const values = table.belongsToMany ?? [];
        allValues.push(...values);
        break;
      }
      case 'hasOne': {
        const values = table.hasOne ?? [];
        allValues.push(...values);
        break;
      }
      case 'belongsTo': {
        const values = table.belongsTo ?? [];
        allValues.push(...values);
        break;
      }
      case 'requiredColumns': {
        const values = table.requiredColumns ?? [];
        allValues.push(...values);
        break;
      }
      case 'pivotRelationships.relatedTable': {
        const pivotTables =
          table.pivotRelationships?.map((rel) => rel.relatedTable) ?? [];
        allValues.push(...pivotTables);
        break;
      }
      case 'pivotRelationships.pivotTable': {
        const pivotTables =
          table.pivotRelationships?.map((rel) => rel.pivotTable) ?? [];
        allValues.push(...pivotTables);
        break;
      }
      case 'columnsInfo': {
        // Handle columnsInfo specially to extract column_name values
        const columnNames = table.columnsInfo.map((col) => col.column_name);
        allValues.push(...columnNames);
        break;
      }
    }
  }

  // Remove duplicates if requested, apply filter, and filter ignored values
  let finalValues = removeDuplicates ? [...new Set(allValues)] : allValues;
  finalValues = applyFilter(finalValues);
  finalValues = filterIgnored(finalValues);

  // Map values through template and join with proper replacements
  const lines = finalValues.map((value) => {
    // Get all case variations of the value using changeCase
    const caseFormats = changeCase(value);

    // Add all case variations and the raw value to replacements
    const replacements: Record<string, string | string[]> = {
      value, // Raw value without case transformation
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
      // Add table replacements for other placeholders that might be in the template
      ...getReplacementsForTable(table, schemaInfoParsed),
    };

    // Add all placeholders found in the YAML file for this value
    const placeholders = allPlaceholderValues.get(value);
    if (placeholders !== undefined) {
      Object.entries(placeholders).forEach(([key, val]) => {
        replacements[key] = val;
      });
    }

    const ctx = {
      userFiles,
      schemaInfo: [],
      schemaInfoParsed,
      projectYamlPath: projectFilePath ?? '',
      table,
      formData,
      userMetadata,
    };

    return replacePlaceholders(template, replacements, ctx, template);
  });

  return joinWithSeparator(lines);
};

/**
 * Helper function to process all files in a folder
 */
const processFilesInFolder = (
  folder: IFolder,
  includedFiles: string[],
  excludedFiles: string[],
  allValues: string[],
  allPlaceholderValues: Map<string, Record<string, string>>,
  fileNameMap: Map<string, string>,
): void => {
  folder.children.forEach((item) => {
    if (item.type === 'file') {
      const fileName = item.name;
      const fileBaseName = fileName.replace(/\.[^.]+$/, '');

      // Apply include/exclude filters based on the filename
      const shouldInclude =
        includedFiles.length === 0 ||
        includedFiles.some((pattern) => fileName.includes(pattern));

      const shouldExclude = excludedFiles.some((pattern) =>
        fileName.includes(pattern),
      );

      // Skip this file if it doesn't meet the include/exclude criteria
      if (!shouldInclude || shouldExclude) {
        return;
      }

      // For YAML files, try to extract structured data
      if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
        // Safely try to parse YAML content
        const content = item.content;
        try {
          // Fix unsafe assignment of any value
          const parsedContent: unknown = parse(content);

          // Process YAML content if it's a valid object
          if (
            parsedContent !== null &&
            typeof parsedContent === 'object' &&
            !Array.isArray(parsedContent)
          ) {
            const extractedValues: Record<string, string> = {};
            // Use type assertion function to safely convert to Record type
            const recordContent = objectToRecord(parsedContent);

            // Process all properties in the object
            Object.entries(recordContent).forEach(([key, value]) => {
              if (typeof value === 'string') {
                extractedValues[key] = value;
              } else if (
                typeof value === 'number' ||
                typeof value === 'boolean'
              ) {
                extractedValues[key] = String(value);
              } else if (Array.isArray(value)) {
                extractedValues[key] = value
                  .map((item) => String(item))
                  .join(',');
              }
            });

            if (Object.keys(extractedValues).length > 0) {
              // If we have at least one valid property, ensure 'value' is set
              if (!('value' in extractedValues)) {
                extractedValues.value = fileBaseName;
              }

              // Determine primary value to use for the iteration
              let primaryValue = extractedValues.value || fileBaseName;

              // Try common identifier properties first
              const identifiers = ['id', 'name', 'key', 'identifier'];
              for (const id of identifiers) {
                if (id in extractedValues) {
                  primaryValue = extractedValues[id];
                  break;
                }
              }

              allValues.push(primaryValue);
              allPlaceholderValues.set(primaryValue, extractedValues);
              fileNameMap.set(primaryValue, fileName);
              return; // Skip to next file
            }
          }
        } catch {
          // YAML parsing failed, fall back to treating as regular file
          // Don't throw, just silently continue with fallback
        }
      }

      // Fallback for non-YAML files or if YAML processing failed
      allValues.push(fileBaseName);
      allPlaceholderValues.set(fileBaseName, { value: fileBaseName });
      fileNameMap.set(fileBaseName, fileName);
    }
  });
};

/**
 * Helper function to safely convert an object to Record<string, unknown>
 */
const objectToRecord = (obj: object): Record<string, unknown> => {
  return { ...obj };
};
