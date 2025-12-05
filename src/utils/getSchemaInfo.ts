import type {
  ISchemaInfo,
  IColumnInfo,
  ParsedJSONSchema,
} from '@/interfaces/interfaces.ts';
import { hiddenFields } from '@/frameworks/backend/laravel/createModels.ts';

interface IRelationships {
  hasOne?: string[];
  hasMany?: string[];
  belongsTo?: string[];
  belongsToMany?: string[];
  pivotRelationships?: {
    relatedTable: string;
    pivotTable: string;
  }[];
}

export interface ISchemaInfoResult {
  schema: ISchemaInfo[];
  tableNames: string[];
  pivotTables: string[];
  seedData: Record<PropertyKey, unknown>;
  getPrimaryKey: (tableName: string) => string;
  getForeignTables: (tableName: string) => string[];
  getRequiredColumns: (tableName: string) => string[];
  getAllColumns: (tableName: string) => string[];
  getHiddenColumns: (tableName: string) => string[];
  getColumnsInfo: (tableName: string) => IColumnInfo[];
  getChildTables: (tableName: string) => string[];
  getRelationships: (tableName: string) => IRelationships;
  isPivot: (tableName: string) => boolean;
  getSeedData: (tableName: string) => Record<string, unknown>[] | undefined;
  getAllSeedData: () => ParsedJSONSchema;
}

export const getSchemaInfo = (schema: ISchemaInfo[]): ISchemaInfoResult => {
  /* Create a map for quick table lookups */
  const tableMap = new Map<string, ISchemaInfo>();
  schema.forEach((table) => {
    tableMap.set(table.tableName, table);
  });

  /* Get all table names */
  const tableNames = schema.map((table) => table.tableName);

  /* Get pivot tables */
  const pivotTables = schema
    .filter((table) => table.isPivot === true)
    .map((table) => table.tableName);

  /* Get primary key column for a table */
  const getPrimaryKey = (tableName: string): string => {
    const table = tableMap.get(tableName);
    if (!table) {
      return '';
    }
    const primaryKeys = table.columnsInfo
      .filter((col: IColumnInfo) => col.primary_key === true)
      .map((col: IColumnInfo) => col.column_name);

    return primaryKeys[0] ?? '';
  };

  /* Get foreign tables for a table */
  const getForeignTables = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.foreignTables ?? [];
  };

  /* Get required columns for a table */
  const getRequiredColumns = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }

    const requiredFromColumns = table.columnsInfo
      .filter((col: IColumnInfo) => col.is_nullable === 'NO')
      .map((col: IColumnInfo) => col.column_name);

    const explicitlyRequired = table.requiredColumns ?? [];

    return [...new Set([...requiredFromColumns, ...explicitlyRequired])];
  };

  /* Get all columns for a table */
  const getAllColumns = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.columnsInfo.map((col: IColumnInfo) => col.column_name);
  };

  /* Get hidden columns for a table */
  const getHiddenColumns = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }

    const allColumns = table.columnsInfo.map((col) => col.column_name);
    return allColumns.filter((column) => hiddenFields.includes(column));
  };

  /* Get columns info for a table */
  const getColumnsInfo = (tableName: string): IColumnInfo[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.columnsInfo;
  };

  /* Get child tables for a table */
  const getChildTables = (tableName: string): string[] => {
    const table = tableMap.get(tableName);
    if (!table) {
      return [];
    }
    return table.childTables ?? [];
  };

  /* Check if a table is a pivot table */
  const isPivot = (tableName: string): boolean => {
    const table = tableMap.get(tableName);
    if (!table) {
      return false;
    }
    return table.isPivot === true;
  };

  /* Get all relationships for a table */
  const getRelationships = (tableName: string): IRelationships => {
    const table = tableMap.get(tableName);
    if (!table) {
      return {};
    }

    return {
      hasOne: table.hasOne,
      hasMany: table.hasMany,
      belongsTo: table.belongsTo,
      belongsToMany: table.belongsToMany,
      pivotRelationships: table.pivotRelationships,
    };
  };

  /* Topological sort to determine the correct order of tables */
  const topologicalSort = (schemaInfo: ISchemaInfo[]): ISchemaInfo[] => {
    const sorted: ISchemaInfo[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (table: ISchemaInfo) => {
      if (temp.has(table.tableName)) {
        throw new Error('Cyclic dependency detected');
      }
      if (!visited.has(table.tableName)) {
        temp.add(table.tableName);
        (table.childTables ?? []).forEach((childTable) => {
          const childRelationship = schemaInfo.find(
            (r) => r.tableName === childTable,
          );
          if (childRelationship) {
            visit(childRelationship);
          }
        });
        temp.delete(table.tableName);
        visited.add(table.tableName);
        sorted.push(table);
      }
    };

    schemaInfo.forEach((table) => {
      if (!visited.has(table.tableName)) {
        visit(table);
      }
    });

    return sorted.reverse(); // Reverse to get the correct order
  };

  /* Get seed data for a specific table */
  const getSeedData = (
    tableName: string,
  ): Record<string, unknown>[] | undefined => {
    const table = tableMap.get(tableName);
    if (!table) {
      return undefined;
    }
    if (!table.data || !Array.isArray(table.data) || table.data.length === 0) {
      return undefined;
    }
    return table.data;
  };

  /* Get all seed data ordered by dependencies */
  const getAllSeedData = (): ParsedJSONSchema => {
    const seedData: ParsedJSONSchema = {};

    // Get all tables with seed data
    const tablesWithSeedData = schema.filter(
      (table) =>
        Boolean(table.data) &&
        Array.isArray(table.data) &&
        table.data.length > 0,
    );

    if (tablesWithSeedData.length === 0) {
      return seedData;
    }

    // Sort tables by dependencies (parents before children)
    const sortedTables = topologicalSort(tablesWithSeedData);

    // Build seed data in dependency order
    sortedTables.forEach((table) => {
      if (table.data && Array.isArray(table.data) && table.data.length > 0) {
        seedData[table.tableName] = table.data;
      }
    });

    return seedData;
  };

  /* Get seed data as Record for backward compatibility */
  const seedData: Record<PropertyKey, unknown> = getAllSeedData();

  return {
    schema,
    tableNames,
    pivotTables,
    seedData,
    getPrimaryKey,
    getForeignTables,
    getAllColumns,
    getRequiredColumns,
    getHiddenColumns,
    getColumnsInfo,
    getChildTables,
    getRelationships,
    isPivot,
    getSeedData,
    getAllSeedData,
  };
};

export default getSchemaInfo;
