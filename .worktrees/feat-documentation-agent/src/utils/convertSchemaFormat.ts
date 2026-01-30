import type {
  ISchemaInfo,
  ISchemaInfoSlim,
  IColumnInfo,
  IColumnInfoSlim,
} from '@/interfaces/interfaces.ts';

interface IConvertSchemaParams {
  schema: ISchemaInfo[] | ISchemaInfoSlim;
  target: 'full' | 'compressed';
}

const convertFullToSlim = (schema: ISchemaInfo[]): ISchemaInfoSlim => {
  return schema.map((table) => {
    const slimTable: ISchemaInfoSlim[number] = {
      tableName: table.tableName,
      columns: table.columnsInfo.map((column) => {
        const slimColumn: IColumnInfoSlim = {
          name: column.column_name,
          type: column.data_type,
        };

        if (column.is_nullable === 'YES') {
          slimColumn.nullable = true;
        }

        if (
          column.column_default !== undefined &&
          column.column_default !== null
        ) {
          slimColumn.default = column.column_default;
        }

        if (column.primary_key === true) {
          slimColumn.primaryKey = true;
        }

        if (column.unique === true) {
          slimColumn.unique = true;
        }

        if (column.foreign_key !== undefined) {
          slimColumn.foreign = column.foreign_key.foreign_table_name;
        }

        return slimColumn;
      }),
    };

    if (table.isPivot === true) {
      slimTable.isPivot = true;
    }

    if (table.viewQuery !== undefined) {
      slimTable.viewQuery = table.viewQuery;
    }

    if (table.viewStructure !== undefined && table.viewStructure.length > 0) {
      slimTable.viewStructure = table.viewStructure;
    }

    if (table.data !== undefined && table.data.length > 0) {
      slimTable.data = table.data;
    }

    return slimTable;
  });
};

const convertSlimToFull = (schema: ISchemaInfoSlim): ISchemaInfo[] => {
  const tableMap = new Map<string, ISchemaInfoSlim[number]>();
  schema.forEach((table) => {
    tableMap.set(table.tableName, table);
  });

  return schema.map((table) => {
    const fullTable: ISchemaInfo = {
      tableName: table.tableName,
      columnsInfo: table.columns.map((column) => {
        const fullColumn: IColumnInfo = {
          column_name: column.name,
          data_type: column.type,
          is_nullable: column.nullable === true ? 'YES' : 'NO',
        };

        if (column.default !== undefined && column.default !== null) {
          fullColumn.column_default = column.default;
        }

        if (column.primaryKey === true) {
          fullColumn.primary_key = true;
        }

        if (column.unique === true) {
          fullColumn.unique = true;
        }

        if (column.foreign !== undefined) {
          const foreignTable = tableMap.get(column.foreign);
          if (foreignTable === undefined) {
            throw new Error(
              `Foreign table "${column.foreign}" not found in schema for column "${column.name}" in table "${table.tableName}"`,
            );
          }

          const primaryKeyColumn = foreignTable.columns.find(
            (col) => col.primaryKey === true,
          );

          if (primaryKeyColumn === undefined) {
            throw new Error(
              `Primary key not found in foreign table "${column.foreign}" referenced by column "${column.name}" in table "${table.tableName}"`,
            );
          }

          fullColumn.foreign_key = {
            foreign_table_name: column.foreign,
            foreign_column_name: primaryKeyColumn.name,
          };
        }

        return fullColumn;
      }),
    };

    if (table.isPivot === true) {
      fullTable.isPivot = true;
    }

    if (table.viewQuery !== undefined) {
      fullTable.viewQuery = table.viewQuery;
    }

    if (table.viewStructure !== undefined && table.viewStructure.length > 0) {
      fullTable.viewStructure = table.viewStructure;
    }

    if (table.data !== undefined && table.data.length > 0) {
      fullTable.data = table.data;
    }

    const nonNullableColumns = fullTable.columnsInfo
      .filter((col) => col.is_nullable === 'NO')
      .map((col) => col.column_name);

    if (nonNullableColumns.length > 0) {
      fullTable.requiredColumns = nonNullableColumns;
    }

    const foreignKeys = fullTable.columnsInfo
      .filter((col) => col.foreign_key !== undefined)
      .map((col) => col.column_name);

    if (foreignKeys.length > 0) {
      fullTable.foreignKeys = foreignKeys;
    }

    const foreignTables = fullTable.columnsInfo
      .filter(
        (
          col,
        ): col is IColumnInfo & {
          foreign_key: NonNullable<IColumnInfo['foreign_key']>;
        } => col.foreign_key !== undefined,
      )
      .map((col) => col.foreign_key.foreign_table_name);

    const uniqueForeignTables = Array.from(new Set(foreignTables));

    if (uniqueForeignTables.length > 0) {
      fullTable.foreignTables = uniqueForeignTables;
    }

    const childTables: string[] = [];
    schema.forEach((otherTable) => {
      const hasForeignKeyToThisTable = otherTable.columns.some(
        (col) => col.foreign === table.tableName,
      );
      if (hasForeignKeyToThisTable) {
        childTables.push(otherTable.tableName);
      }
    });

    if (childTables.length > 0) {
      fullTable.childTables = childTables;
    }

    const belongsTo = fullTable.columnsInfo
      .filter(
        (
          col,
        ): col is IColumnInfo & {
          foreign_key: NonNullable<IColumnInfo['foreign_key']>;
        } => col.foreign_key !== undefined,
      )
      .map((col) => col.foreign_key.foreign_table_name);

    const uniqueBelongsTo = Array.from(new Set(belongsTo));

    if (uniqueBelongsTo.length > 0) {
      fullTable.belongsTo = uniqueBelongsTo;
    }

    const hasOne: string[] = [];
    const hasMany: string[] = [];

    schema.forEach((otherTable) => {
      otherTable.columns.forEach((col) => {
        if (col.foreign === table.tableName) {
          if (col.unique === true) {
            hasOne.push(otherTable.tableName);
          } else {
            hasMany.push(otherTable.tableName);
          }
        }
      });
    });

    if (hasOne.length > 0) {
      fullTable.hasOne = Array.from(new Set(hasOne));
    }

    if (hasMany.length > 0) {
      fullTable.hasMany = Array.from(new Set(hasMany));
    }

    const pivotTables = schema.filter((t) => t.isPivot === true);
    const belongsToMany: string[] = [];
    const pivotRelationships: {
      relatedTable: string;
      pivotTable: string;
    }[] = [];

    pivotTables.forEach((pivotTable) => {
      const foreignColumns = pivotTable.columns.filter(
        (col): col is IColumnInfoSlim & { foreign: string } =>
          col.foreign !== undefined,
      );

      if (foreignColumns.length === 2) {
        const [foreignCol1, foreignCol2] = foreignColumns;
        const table1 = foreignCol1.foreign;
        const table2 = foreignCol2.foreign;

        if (table1 === table.tableName) {
          belongsToMany.push(table2);
          pivotRelationships.push({
            relatedTable: table2,
            pivotTable: pivotTable.tableName,
          });
        } else if (table2 === table.tableName) {
          belongsToMany.push(table1);
          pivotRelationships.push({
            relatedTable: table1,
            pivotTable: pivotTable.tableName,
          });
        }
      }
    });

    if (belongsToMany.length > 0) {
      fullTable.belongsToMany = Array.from(new Set(belongsToMany));
    }

    if (pivotRelationships.length > 0) {
      fullTable.pivotRelationships = pivotRelationships;
    }

    return fullTable;
  });
};

/**
 * Converts schema between full and compressed formats.
 *
 * **When to use each format:**
 * - **Full Format (`ISchemaInfo[]`)**: Use for localStorage, file storage, Zustand stores, and internal state
 * - **Compressed Format (`ISchemaInfoSlim`)**: Use for API payloads, WebSocket messages, and network transmission
 *
 * See the [Schema Formats Guide](/documentation/api-reference/schema-management/schema-formats/) for detailed usage guidelines.
 *
 * @example
 * ```typescript
 * // Convert full schema to compressed (for API payloads)
 * const compressed = convertSchema({ schema: fullSchema, target: "compressed" });
 *
 * // Convert compressed schema to full (after receiving from API)
 * const full = convertSchema({ schema: compressedSchema, target: "full" });
 * ```
 */
const isFullSchema = (
  schema: ISchemaInfo[] | ISchemaInfoSlim,
): schema is ISchemaInfo[] => {
  return (
    Array.isArray(schema) && schema.length > 0 && 'columnsInfo' in schema[0]
  );
};

const isCompressedSchema = (
  schema: ISchemaInfo[] | ISchemaInfoSlim,
): schema is ISchemaInfoSlim => {
  return Array.isArray(schema) && schema.length > 0 && 'columns' in schema[0];
};

export const convertSchema = ({
  schema,
  target,
}: IConvertSchemaParams): ISchemaInfo[] | ISchemaInfoSlim => {
  if (target === 'compressed') {
    if (!isFullSchema(schema)) {
      throw new Error('Schema must be full format for compressed conversion');
    }
    const fullSchema: ISchemaInfo[] = schema;
    return convertFullToSlim(fullSchema);
  }
  if (!isCompressedSchema(schema)) {
    throw new Error('Schema must be compressed format for full conversion');
  }
  const compressedSchema: ISchemaInfoSlim = schema;
  return convertSlimToFull(compressedSchema);
};
