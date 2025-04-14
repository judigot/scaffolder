import { IFolder, IFile, IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { ISchemaInfoResult } from '@/utils/getSchemaInfo.ts';
import { getReplacementsForTable } from '@/utils/project-builder/template-processors/getReplacementsForTable.ts';
import { replacePlaceholders } from '@/utils/project-builder/utils/replacePlaceholders.ts';
import { parse } from 'yaml';

export const loadConstant = (
  constantName: string,
  userFiles: IStructure,
  schemaInfoParsed: ISchemaInfoResult,
  table?: ISchemaInfo,
  projectFilePath?: string,
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

    // Type guard for Record<string, unknown>
    function isRecord(value: unknown): value is Record<string, unknown> {
      return value !== null && typeof value === 'object';
    }

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
      return rawValues.map((value) =>
        replacePlaceholders(
          value, 
          replacements, 
          userFiles, 
          schemaInfoParsed, 
          table, 
          projectFilePath,
          constantName
        ),
      );
    }

    return rawValues;
  } catch {
    return [];
  }
};
