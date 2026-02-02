import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import type { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces.ts';
import { parse } from 'yaml';
import { findProjectsFolderAtRoot } from './findProjectsFolderAtRoot.ts';

export interface IProjectInfo {
  name: string;
  path: string;
  schemaFilter: string[];
  useCores: string[];
}

/**
 * Type guard for Record<string, unknown>
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Extracts $SCHEMA_FILTER and $USE_CORE from a project's structure.yaml
 */
const extractProjectInfo = (
  projectFolder: IFolder,
): { schemaFilter: string[]; useCores: string[] } => {
  const structureFile = projectFolder.children.find(
    (file): file is IFile =>
      file.type === 'file' && file.name === 'structure.yaml',
  );

  if (!structureFile) {
    return { schemaFilter: [], useCores: [] };
  }

  try {
    const parsed: unknown = parse(structureFile.content);

    if (!isRecord(parsed)) {
      return { schemaFilter: [], useCores: [] };
    }

    let schemaFilter: string[] = [];
    let useCores: string[] = [];

    // Extract $SCHEMA_FILTER
    if ('$SCHEMA_FILTER' in parsed) {
      const filterValue = parsed.$SCHEMA_FILTER;
      if (typeof filterValue === 'string') {
        schemaFilter = [filterValue];
      } else if (Array.isArray(filterValue)) {
        schemaFilter = filterValue.filter(
          (item): item is string => typeof item === 'string',
        );
      }
    }

    // Extract $USE_CORE
    if ('$USE_CORE' in parsed) {
      const coreValue = parsed.$USE_CORE;
      if (typeof coreValue === 'string') {
        useCores = [coreValue];
      } else if (Array.isArray(coreValue)) {
        useCores = coreValue.filter(
          (item): item is string => typeof item === 'string',
        );
      }
    }

    return { schemaFilter, useCores };
  } catch {
    return { schemaFilter: [], useCores: [] };
  }
};

/**
 * Gets all projects from the file structure
 */
export const getAllProjects = (userFiles: IStructure): IProjectInfo[] => {
  const projectsFolder = findProjectsFolderAtRoot(userFiles);

  if (!projectsFolder) {
    return [];
  }

  const projects: IProjectInfo[] = [];

  for (const child of projectsFolder.children) {
    if (child.type === 'folder') {
      const hasStructure = child.children.some(
        (file) => file.type === 'file' && file.name === 'structure.yaml',
      );

      if (hasStructure) {
        const { schemaFilter, useCores } = extractProjectInfo(child);
        projects.push({
          name: child.name,
          path: `Projects/${child.name}/structure.yaml`,
          schemaFilter,
          useCores,
        });
      }
    }
  }

  return projects;
};

/**
 * Matches a wildcard pattern against a string
 * Supports * as wildcard (matches any characters)
 */
const matchWildcard = (pattern: string, value: string): boolean => {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
    .replace(/\*/g, '.*'); // Convert * to .*
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(value);
};

/**
 * Evaluates a single filter rule against schemaInfo
 *
 * Filter syntax:
 * - "$schema_name=pattern" → match schema name (supports * wildcard)
 * - "tableName" → table must exist
 * - "tableName.columnName" → column must exist in table
 * - "tableName.columnName.property=value" → property must equal value
 *
 * Column properties:
 * - data_type, is_nullable, column_default, primary_key, unique, foreign_key
 */
const evaluateFilter = (
  filter: string,
  schemaInfo: ISchemaInfo[],
  schemaName?: string,
): boolean => {
  // Handle $schema_name filter
  if (filter.startsWith('$schema_name=')) {
    const pattern = filter.substring('$schema_name='.length);
    if (!schemaName) {
      return false;
    }
    return matchWildcard(pattern, schemaName);
  }

  // Handle wildcard - any table exists
  if (filter === '*') {
    return schemaInfo.length > 0;
  }

  const parts = filter.split('.');

  // Table existence check: "tableName"
  if (parts.length === 1) {
    const tableName = parts[0];
    return schemaInfo.some((table) => table.tableName === tableName);
  }

  const tableName = parts[0];
  const table = schemaInfo.find((t) => t.tableName === tableName);

  if (!table) {
    return false;
  }

  // Column existence check: "tableName.columnName"
  if (parts.length === 2) {
    const columnName = parts[1];
    return table.columnsInfo.some((col) => col.column_name === columnName);
  }

  // Property check: "tableName.columnName.property=value" or "tableName.columnName.property"
  if (parts.length >= 3) {
    const columnName = parts[1];
    const column = table.columnsInfo.find((col) => col.column_name === columnName);

    if (!column) {
      return false;
    }

    const propertyPart = parts.slice(2).join('.');

    // Check if it's an equality check
    if (propertyPart.includes('=')) {
      const [property, expectedValue] = propertyPart.split('=');
      const actualValue = getColumnProperty(column, property);

      if (actualValue === undefined) {
        return false;
      }

      return String(actualValue).toLowerCase() === expectedValue.toLowerCase();
    }

    // Just check property existence
    const actualValue = getColumnProperty(column, propertyPart);
    return actualValue !== undefined && actualValue !== null;
  }

  return false;
};

/**
 * Gets a property value from a column
 */
const getColumnProperty = (
  column: IColumnInfo,
  property: string,
): unknown => {
  switch (property) {
    case 'data_type':
    case 'dataType':
      return column.data_type;
    case 'is_nullable':
    case 'isNullable':
      return column.is_nullable;
    case 'column_default':
    case 'columnDefault':
    case 'default':
      return column.column_default;
    case 'primary_key':
    case 'primaryKey':
      return column.primary_key;
    case 'unique':
      return column.unique;
    case 'foreign_key':
    case 'foreignKey':
      return column.foreign_key;
    default:
      return undefined;
  }
};

/**
 * Checks if a schema matches a project's filter rules
 * All filter rules must pass (AND logic)
 */
export const schemaMatchesFilter = (
  schemaInfo: ISchemaInfo[],
  schemaFilter: string[],
  schemaName?: string,
): boolean => {
  // No filter means accept any schema
  if (schemaFilter.length === 0) {
    return true;
  }

  // All filters must pass
  return schemaFilter.every((filter) =>
    evaluateFilter(filter, schemaInfo, schemaName),
  );
};

/**
 * Filters projects that are compatible with the given schemaInfo
 */
export const filterCompatibleProjects = (
  schemaInfo: ISchemaInfo[],
  userFiles: IStructure,
  schemaName?: string,
): IProjectInfo[] => {
  const allProjects = getAllProjects(userFiles);

  return allProjects.filter((project) =>
    schemaMatchesFilter(schemaInfo, project.schemaFilter, schemaName),
  );
};
