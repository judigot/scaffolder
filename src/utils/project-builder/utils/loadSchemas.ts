import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { parse } from 'yaml';
import { findProjectsFolderAtRoot } from './findProjectsFolderAtRoot.ts';

export interface ISchemaColumn {
  type: string;
  length?: number;
  primary?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: string;
  description?: string;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
}

export interface ISchemaIndex {
  name?: string;
  columns: string[];
  unique?: boolean;
}

export interface ISchemaTable {
  description?: string;
  columns: Record<string, ISchemaColumn>;
  indexes?: ISchemaIndex[];
}

export interface ISchemaModule {
  name: string;
  description?: string;
  version?: string;
  requires?: string[];
  preset?: boolean;
  includes?: string[];
  features?: Record<string, boolean>;
  tables?: Record<string, ISchemaTable>;
}

export interface IMergedSchema {
  tables: Record<string, ISchemaTable>;
  modules: string[];
  features: Record<string, boolean>;
}

const findProjectFolder = (
  projectYamlPath: string,
  userFiles: IStructure,
): IFolder | null => {
  const normPath = projectYamlPath.startsWith('/')
    ? projectYamlPath.substring(1)
    : projectYamlPath;

  const projectsFolder = findProjectsFolderAtRoot(userFiles);

  if (projectsFolder === undefined) {
    return null;
  }

  for (const child of projectsFolder.children) {
    if (child.type === 'folder') {
      const structureFile = child.children.find(
        (file): file is IFile =>
          file.type === 'file' && file.name === 'structure.yaml',
      );

      if (structureFile) {
        const expectedPath = `Projects/${child.name}/structure.yaml`;
        if (normPath === expectedPath) {
          return child;
        }
      }
    }
  }

  return null;
};

/**
 * Resolves a schema path to its JSON content
 * Handles both direct schema paths and preset paths
 */
const resolveSchemaFile = (
  schemaPath: string,
  userFiles: IStructure,
): ISchemaModule | null => {
  // Normalize path: /Schemas/Auth/base -> Schemas/Auth/base.json
  let normPath = schemaPath.startsWith('/')
    ? schemaPath.substring(1)
    : schemaPath;

  // Add .json extension if not present
  if (!normPath.endsWith('.json')) {
    normPath = `${normPath}.json`;
  }

  const pathComponents = normPath.split('/');
  const fileName = pathComponents.pop();

  if (fileName === undefined || fileName === '') {
    return null;
  }

  let currentItems: IStructure = userFiles;

  for (const component of pathComponents) {
    const folder = currentItems.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === component,
    );

    if (!folder) {
      return null;
    }

    currentItems = folder.children;
  }

  const schemaFile = currentItems.find(
    (item): item is IFile => item.type === 'file' && item.name === fileName,
  );

  if (!schemaFile) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(schemaFile.content);
    if (isSchemaModule(parsed)) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error(`Error parsing schema file ${schemaPath}:`, error);
    return null;
  }
};

/**
 * Type guard for Record<string, unknown>
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard for ISchemaModule
 */
function isSchemaModule(value: unknown): value is ISchemaModule {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.name === 'string';
}

/**
 * Type guard for parsed YAML with $USE_SCHEMA
 */
function hasUseSchema(value: unknown): value is { $USE_SCHEMA: unknown } {
  if (!isRecord(value)) {
    return false;
  }
  return '$USE_SCHEMA' in value;
}

/**
 * Recursively loads a schema module and its dependencies
 */
const loadSchemaWithDependencies = (
  schemaPath: string,
  userFiles: IStructure,
  loadedModules: Set<string>,
): IMergedSchema => {
  const result: IMergedSchema = {
    tables: {},
    modules: [],
    features: {},
  };

  // Prevent circular dependencies
  if (loadedModules.has(schemaPath)) {
    return result;
  }

  const schema = resolveSchemaFile(schemaPath, userFiles);

  if (!schema) {
    console.warn(`Schema not found: ${schemaPath}`);
    return result;
  }

  loadedModules.add(schemaPath);

  // Handle presets: load included modules
  if (schema.preset === true && schema.includes !== undefined) {
    for (const includePath of schema.includes) {
      const included = loadSchemaWithDependencies(
        includePath,
        userFiles,
        loadedModules,
      );

      // Merge tables (later modules override earlier)
      Object.assign(result.tables, included.tables);
      result.modules.push(...included.modules);
      Object.assign(result.features, included.features);
    }

    // Add preset features
    if (schema.features) {
      Object.assign(result.features, schema.features);
    }

    result.modules.push(schema.name);
    return result;
  }

  // Handle regular modules: load dependencies first
  if (schema.requires) {
    for (const depName of schema.requires) {
      // Try to resolve dependency path
      const depPath = schemaPath.includes('/')
        ? schemaPath.substring(0, schemaPath.lastIndexOf('/') + 1) +
          depName.replace('auth-', '')
        : depName;

      // Only load if not already loaded
      if (!loadedModules.has(depPath)) {
        const dep = loadSchemaWithDependencies(
          depPath,
          userFiles,
          loadedModules,
        );
        Object.assign(result.tables, dep.tables);
        result.modules.push(...dep.modules);
        Object.assign(result.features, dep.features);
      }
    }
  }

  // Add this module's tables
  if (schema.tables) {
    Object.assign(result.tables, schema.tables);
  }

  result.modules.push(schema.name);

  return result;
};

/**
 * Loads and merges schemas based on $USE_SCHEMA directive in structure.yaml
 *
 * Supports both single string and array formats:
 * - Single: `$USE_SCHEMA: /Schemas/Presets/Auth - Basic`
 * - Multiple: `$USE_SCHEMA: [/Schemas/Auth/base, /Schemas/Auth/oauth]`
 *
 * Merge order (later wins):
 * Dependencies are loaded first, then the specified schemas in array order
 *
 * @param projectYamlPath - Path to structure.yaml
 * @param userFiles - Complete file structure
 * @returns Merged schema with all tables and features
 */
export const loadSchemas = (
  projectYamlPath: string,
  userFiles: IStructure,
): IMergedSchema | null => {
  const projectFolder = findProjectFolder(projectYamlPath, userFiles);

  if (!projectFolder) {
    return null;
  }

  const structureFile = projectFolder.children.find(
    (file): file is IFile =>
      file.type === 'file' && file.name === 'structure.yaml',
  );

  if (!structureFile) {
    return null;
  }

  try {
    const parsed: unknown = parse(structureFile.content);

    if (hasUseSchema(parsed)) {
      const schemaValue = parsed.$USE_SCHEMA;

      let schemaPaths: string[] = [];

      if (typeof schemaValue === 'string') {
        schemaPaths = [schemaValue];
      } else if (Array.isArray(schemaValue)) {
        schemaPaths = schemaValue.filter(
          (item): item is string => typeof item === 'string',
        );
      }

      if (schemaPaths.length === 0) {
        return null;
      }

      const loadedModules = new Set<string>();
      const mergedSchema: IMergedSchema = {
        tables: {},
        modules: [],
        features: {},
      };

      for (const schemaPath of schemaPaths) {
        const schema = loadSchemaWithDependencies(
          schemaPath,
          userFiles,
          loadedModules,
        );

        // Merge (later schemas override earlier)
        Object.assign(mergedSchema.tables, schema.tables);

        // Add unique modules
        for (const mod of schema.modules) {
          if (!mergedSchema.modules.includes(mod)) {
            mergedSchema.modules.push(mod);
          }
        }

        Object.assign(mergedSchema.features, schema.features);
      }

      return mergedSchema;
    }
  } catch (error) {
    console.error('Error parsing structure.yaml for schema imports:', error);
  }

  return null;
};

/**
 * Converts merged schema tables to ISchemaInfo format for compatibility
 * with existing template processing
 */
export const schemaToSchemaInfo = (
  schema: IMergedSchema,
): {
  tableName: string;
  columns: {
    columnName: string;
    dataType: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    isUnique: boolean;
    defaultValue: string | null;
    foreignKey: {
      table: string;
      column: string;
      onDelete?: string;
    } | null;
  }[];
}[] => {
  return Object.entries(schema.tables).map(([tableName, table]) => ({
    tableName,
    columns: Object.entries(table.columns).map(([columnName, column]) => ({
      columnName,
      dataType: column.type,
      isNullable: column.nullable ?? true,
      isPrimaryKey: column.primary ?? false,
      isUnique: column.unique ?? false,
      defaultValue: column.default ?? null,
      foreignKey: column.references
        ? {
            table: column.references.table,
            column: column.references.column,
            onDelete: column.references.onDelete,
          }
        : null,
    })),
  }));
};
