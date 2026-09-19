import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

export interface ApplicationEntityContract {
  name: string;
  columns: ISchemaInfo['columnsInfo'];
  relationships: {
    hasOne: string[];
    hasMany: string[];
    belongsTo: string[];
    belongsToMany: string[];
  };
}

export interface ApplicationContract {
  version: 1;
  database: 'postgresql';
  entities: ApplicationEntityContract[];
  operations: Array<'list' | 'get' | 'create' | 'update' | 'delete'>;
}

/**
 * Builds the framework-neutral contract consumed by backend adapters.
 * Existing schemaInfo remains the input format; adapter-specific decorators,
 * filenames, and annotations never enter this representation.
 */
export function createApplicationContract(
  schemaInfo: ISchemaInfo[],
): ApplicationContract {
  return {
    version: 1,
    database: 'postgresql',
    entities: schemaInfo.map((table) => ({
      name: table.tableName,
      columns: table.columnsInfo,
      relationships: {
        hasOne: table.hasOne ?? [],
        hasMany: table.hasMany ?? [],
        belongsTo: table.belongsTo ?? [],
        belongsToMany: table.belongsToMany ?? [],
      },
    })),
    operations: ['list', 'get', 'create', 'update', 'delete'],
  };
}

