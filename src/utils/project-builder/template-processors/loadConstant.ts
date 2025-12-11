import type { IFolder, IFile, IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { parse } from 'yaml';
import type { IFormStore } from '@/useFormStore.ts';
import { isRecord } from '@/utils/typeGuards.ts';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import { processRelativePath } from '@/utils/project-builder/utils/processRelativePath.ts';

export const loadConstant = (
  constantName: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  projectFilePath?: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
): string[] => {
  const store = userFiles;
  const constantsFolder = store.find(
    (item): item is IFolder =>
      item.type === 'folder' && item.name === 'Constants',
  );

  if (!constantsFolder) {
    return [];
  }

  const constantFile = constantsFolder.children.find(
    (item): item is IFile =>
      item.type === 'file' && item.name === `${constantName}.yaml`,
  );

  if (!constantFile) {
    return [];
  }

  try {
    // Preprocess content to quote values with curly braces to ensure they're parsed as strings
    const preprocessedContent = constantFile.content.replace(
      /^-\s*(\{\{[^}]+\}\})\s*$/gm,
      '- "$1"',
    );

    // Parse YAML content
    const parsed: unknown = parse(preprocessedContent);

    // isRecord imported from @/utils/typeGuards.ts

    // First get raw values without processing placeholders
    let rawValues: string[] = [];

    // Handle both formats:
    // Format 1: Array of values
    if (Array.isArray(parsed)) {
      rawValues = parsed.map((item) => String(item).trim());
    }
    // Format 2: Named constant object
    else if (isRecord(parsed)) {
      if (constantName in parsed && Array.isArray(parsed[constantName])) {
        const values = parsed[constantName];
        if (Array.isArray(values)) {
          rawValues = values.map((item) => String(item).trim());
        }
      }
    }

    // Then process placeholders if table is provided
    if (table) {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);
      const ctx = {
        userFiles,
        schemaInfo: [],
        schemaInfoParsed,
        projectYamlPath: projectFilePath ?? '',
        table,
        formData,
        userMetadata,
      };
      return rawValues.map((value) =>
        replacePlaceholders(value, replacements, ctx, constantName),
      );
    }

    return rawValues;
  } catch {
    return [];
  }
};

/**
 * Loads constant values from a YAML file at the specified path (relative or absolute)
 * @param filePath The path to the YAML file (can be relative like ./constants/ignoredTables.yaml or absolute like /Projects/App/constants/ignoredTables.yaml)
 * @param userFiles The file structure to search in
 * @param schemaInfoParsed Parsed schema information
 * @param table Optional table context for placeholder replacement
 * @param projectFilePath Optional project file path for resolving relative paths
 * @param formData Optional form data
 * @param userMetadata Optional user metadata
 * @returns Array of string values from the YAML file
 */
export const loadConstantFromPath = (
  filePath: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  projectFilePath?: string,
  formData?: IFormStore,
  userMetadata?: Record<string, unknown> | null,
): string[] => {
  /* Resolve relative paths to absolute paths */
  const resolvedPath = processRelativePath(filePath, projectFilePath);

  /* Find the file in the structure */
  const constantFile = findFileInStructure(resolvedPath, userFiles);

  if (!constantFile) {
    return [];
  }

  try {
    /* Preprocess content to quote values with curly braces to ensure they're parsed as strings */
    const preprocessedContent = constantFile.content.replace(
      /^-\s*(\{\{[^}]+\}\})\s*$/gm,
      '- "$1"',
    );

    /* Parse YAML content */
    const parsed: unknown = parse(preprocessedContent);

    /* First get raw values without processing placeholders */
    let rawValues: string[] = [];

    /* Handle both formats:
     * Format 1: Array of values
     * Format 2: Named constant object (extract the first array found) */
    if (Array.isArray(parsed)) {
      rawValues = parsed.map((item) => String(item).trim());
    } else if (isRecord(parsed)) {
      /* Find the first array value in the object */
      for (const key in parsed) {
        const value = parsed[key];
        if (Array.isArray(value)) {
          rawValues = value.map((item) => String(item).trim());
          break;
        }
      }
    }

    /* Then process placeholders if table is provided */
    if (table) {
      const replacements = getReplacementsForTable(table, schemaInfoParsed);
      const ctx = {
        userFiles,
        schemaInfo: [],
        schemaInfoParsed,
        projectYamlPath: projectFilePath ?? '',
        table,
        formData,
        userMetadata,
      };
      return rawValues.map((value) =>
        replacePlaceholders(value, replacements, ctx, filePath),
      );
    }

    return rawValues;
  } catch {
    return [];
  }
};
