import type {
  IColumnInfo,
  ISchemaInfo,
  ParsedJSONSchema,
} from '@/interfaces/interfaces.ts';
import convertType from '@/utils/convertType.ts';
import identifyTSPrimitiveType from '@/utils/identifyTSPrimitiveType.ts';
import {
  getForeignKeys,
  getForeignTables,
  getRequiredColumns,
} from '@/utils/convertIntrospectedStructure.ts';
import { sortTablesBasedOnHierarchy } from '@/utils/sortTablesBasedOnHierarchy.ts';

/* Relationship Rules:

Pivot Table Description:
  - It does not have any child tables.
  - The table name should be a combination of the related table names, formatted as either order_product or product_order, depending on the preferred order.

HasMany Rules:
  - Use `hasMany` when the current table (parent table) has a one-to-many relationship with another table (child table).
  - Applicable when the foreign key in the child table references the primary key in the parent table, and the foreign key can appear multiple times in the child table.
  - If a column is both a foreign key and is not unique, then the table should be added in hasMany.
      Example: If user_id column is a foreign key and is not unique in the post table, then in the users table, it should have hasMany: ["post"]

HasOne Rules:
  - Use `hasOne` for one-to-one relationships where the current table (parent table) is associated with exactly one record in another table (child table).
  - Typically applied when the foreign key is in the child table, referencing the primary key in the parent table.

BelongsTo Rules:
  - Use `belongsTo` when the current table (child table) has a foreign key that references the primary key in another table (parent table).
  - Applicable when the current table is the child in a one-to-one or one-to-many relationship.

BelongsToMany Rules:
  - Use `belongsToMany` for many-to-many relationships where the current table (child table) is linked to another table through a junction/pivot table.
  - Applicable when the current table and another table are both parents, and their relationship is managed by a separate junction table with foreign keys referencing both parent tables.

*/

export const UNIQUE_COLUMN_NAMES = [
  'id',
  'email',
  'username',
  'user_name',
  'slug',
  'isbn',
  'uuid',
  'sku',
  'phone_number',
  'account_number',
  'employee_id',
  'serial_number',
  'transaction_id',
  'order_number',
  'passport_number',
  'driver_license_number',
  'vin',
  'registration_number',
  'tracking_number',
];

// Interfaces
interface IFieldInfo {
  types: Set<string>;
  nullable: boolean;
}

/* 
  Populate field information from the rows, capturing each field's type(s) and nullability.
*/
const populateFieldInfo = (
  records: Record<string, unknown>[],
): Record<string, IFieldInfo> => {
  const fields: Record<string, IFieldInfo> = {};

  records.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      fields[key] = {
        types: new Set<string>(),
        nullable: false,
      };
      fields[key].types.add(
        value === null ? 'null' : identifyTSPrimitiveType(value),
      );
      if (value === null) {
        fields[key].nullable = true;
      }
    });
  });

  return fields;
};

/* 
  Mark whether each table is a pivot table (junction table).
*/
export function identifyPivotTables(schemaInfo: ISchemaInfo[]): ISchemaInfo[] {
  return schemaInfo.map((relationship) => {
    // Reassign to true only if it meets pivot condition
    if (isJunctionTable(relationship, schemaInfo)) {
      relationship.isPivot = true;
    }

    return {
      ...relationship,
    };
  });
}

/* 
  Determine the primary key field name based on convention or 'id'.
*/
const determinePrimaryKeyField = (
  tableName: string,
  firstKey: string,
): string => {
  return [`${tableName}_id`, 'id'].includes(firstKey)
    ? firstKey
    : `${tableName}_id`;
};

/* 
  Detect one-to-many relationships by checking if any foreign key value repeats.
*/
const detectOneToManyRelationship = (
  rows: Record<string, unknown>[],
  foreignKey: string,
): boolean => {
  const foreignKeyCounts: Record<string, number> = {};

  rows.forEach((row) => {
    const value = String(row[foreignKey]);
    foreignKeyCounts[value] = (foreignKeyCounts[value] || 0) + 1;
  });

  return Object.values(foreignKeyCounts).some((count) => count > 1);
};

/* 
  Check if a table is a junction (pivot) table.
  A table is pivot if:
    - It has exactly two foreign keys.
    - The table name is a combination of the parent tables' names.
    - It has no child tables.
*/
export const isJunctionTable = (
  relationship: ISchemaInfo,
  schemaInfo: ISchemaInfo[],
): boolean => {
  const foreignKeys = relationship.columnsInfo.filter((column) =>
    Boolean(column.foreign_key),
  );

  if (foreignKeys.length === 2) {
    const [firstKey, secondKey] = foreignKeys;

    // Find the parent tables
    const parentTable1 = schemaInfo.find(
      (rel) => rel.tableName === firstKey.foreign_key?.foreign_table_name,
    );
    const parentTable2 = schemaInfo.find(
      (rel) => rel.tableName === secondKey.foreign_key?.foreign_table_name,
    );

    const hasNoChildTables = (relationship.childTables ?? []).length === 0;

    if (parentTable1 && parentTable2) {
      const isNameCombination =
        relationship.tableName ===
          `${parentTable1.tableName}_${parentTable2.tableName}` ||
        relationship.tableName ===
          `${parentTable2.tableName}_${parentTable1.tableName}`;

      return hasNoChildTables && isNameCombination;
    }
  }
  return false;
};

/*
  Add associations (hasOne, hasMany, belongsTo, belongsToMany) to each ISchemaInfo based on foreign keys, pivot detection, etc.
*/
export const addAssociations = (
  schemaInfo: ISchemaInfo[],
  data: ParsedJSONSchema | null = null,
): ISchemaInfo[] => {
  const isIntrospection = data === null;
  const tempSchemaInfo = schemaInfo.map((relationship) => ({
    ...relationship,
    ...(relationship.hasOne && { hasOne: relationship.hasOne }),
    ...(relationship.hasMany && { hasMany: relationship.hasMany }),
    ...(relationship.belongsTo && { belongsTo: relationship.belongsTo }),
    ...(relationship.belongsToMany && {
      belongsToMany: relationship.belongsToMany,
    }),
  }));

  const handleBelongsToMany = (relationship: ISchemaInfo) => {
    const foreignKeys = relationship.columnsInfo.filter((col) =>
      Boolean(col.foreign_key),
    );

    if (foreignKeys.length === 2) {
      const table1 = tempSchemaInfo.find(
        (rel) =>
          rel.tableName === foreignKeys[0].foreign_key?.foreign_table_name,
      );
      const table2 = tempSchemaInfo.find(
        (rel) =>
          rel.tableName === foreignKeys[1].foreign_key?.foreign_table_name,
      );

      if (table1 && table2) {
        // Only create the array if it doesn't exist, then push the new item
        if (!table1.belongsToMany) {
          table1.belongsToMany = [table2.tableName];
        } else {
          table1.belongsToMany.push(table2.tableName);
          // Optionally ensure uniqueness:
          table1.belongsToMany = Array.from(new Set(table1.belongsToMany));
        }

        if (!table2.belongsToMany) {
          table2.belongsToMany = [table1.tableName];
        } else {
          table2.belongsToMany.push(table1.tableName);
          // Optionally ensure uniqueness:
          table2.belongsToMany = Array.from(new Set(table2.belongsToMany));
        }
      }
    }
  };

  tempSchemaInfo.forEach((relationship) => {
    const rows = data ? data[relationship.tableName] : [];

    relationship.columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        const parentTable = tempSchemaInfo.find(
          (rel) => rel.tableName === column.foreign_key?.foreign_table_name,
        );
        if (parentTable) {
          // --- belongsTo ---
          if (!relationship.belongsTo) {
            // if `belongsTo` is undefined, create it
            relationship.belongsTo = [parentTable.tableName];
          } else {
            // if it already exists, push and remove duplicates
            relationship.belongsTo.push(parentTable.tableName);
            relationship.belongsTo = Array.from(
              new Set(relationship.belongsTo),
            );
          }

          // For introspection or JSON data, we differentiate how we detect relationships
          if (!isIntrospection) {
            if (detectOneToManyRelationship(rows, column.column_name)) {
              // --- parentTable.hasMany ---
              if (!parentTable.hasMany) {
                parentTable.hasMany = [relationship.tableName];
              } else {
                parentTable.hasMany.push(relationship.tableName);
                parentTable.hasMany = Array.from(new Set(parentTable.hasMany));
              }
            } else if (!isJunctionTable(relationship, schemaInfo)) {
              // --- parentTable.hasOne ---
              if (!parentTable.hasOne) {
                parentTable.hasOne = [relationship.tableName];
              } else {
                parentTable.hasOne.push(relationship.tableName);
                parentTable.hasOne = Array.from(new Set(parentTable.hasOne));
              }
            }
          } else {
            // For introspected structure
            // Find the primary key column in the parent table that matches the foreign key's referenced column
            const foreignColumnName = column.foreign_key.foreign_column_name;
            const primaryKeyColumn = parentTable.columnsInfo.find(
              (col) =>
                Boolean(col.primary_key) &&
                col.column_name === foreignColumnName,
            );
            if (primaryKeyColumn) {
              if (!column.unique) {
                // --- parentTable.hasMany ---
                if (!parentTable.hasMany) {
                  parentTable.hasMany = [relationship.tableName];
                } else {
                  parentTable.hasMany.push(relationship.tableName);
                  parentTable.hasMany = Array.from(
                    new Set(parentTable.hasMany),
                  );
                }
              } else if (!isJunctionTable(relationship, schemaInfo)) {
                // --- parentTable.hasOne ---
                if (!parentTable.hasOne) {
                  parentTable.hasOne = [relationship.tableName];
                } else {
                  parentTable.hasOne.push(relationship.tableName);
                  parentTable.hasOne = Array.from(new Set(parentTable.hasOne));
                }
              }
            }
          }
        }
      }
    });

    if (isJunctionTable(relationship, schemaInfo)) {
      handleBelongsToMany(relationship);
    }
  });

  return tempSchemaInfo;
};

/*
  Create column information for each field based on the sample rows.
*/
export function createColumnsInfo({
  fields,
  rows,
  tableName,
  primaryKeyField,
}: {
  fields: Record<string, IFieldInfo>;
  rows: Record<string, unknown>[];
  tableName: string;
  primaryKeyField: string;
}): IColumnInfo[] {
  return Object.keys(fields).map((key) => {
    const sampleValue = rows.find((record) => record[key] !== null)?.[key];
    const fieldType = convertType({
      value: sampleValue,
      targetType: 'typescript',
    });
    const isPrimaryKey = key === primaryKeyField;
    const isUnique = UNIQUE_COLUMN_NAMES.includes(key) && !isPrimaryKey;
    const foreignKey =
      key.endsWith('_id') && key !== `${tableName}_id`
        ? {
            foreign_table_name: key.replace('_id', ''),
            foreign_column_name: key,
          }
        : undefined;

    /* Start with only the required props */
    const columnInfo: IColumnInfo = {
      column_name: key,
      data_type: fieldType,
      is_nullable: fields[key].nullable ? 'YES' : 'NO',
    };

    /* Add optional properties only when true or defined */
    if (isPrimaryKey) {
      columnInfo.primary_key = true;
      columnInfo.column_default = 'AUTO_INCREMENT';
    }
    if (isUnique) {
      columnInfo.unique = true;
    }
    if (foreignKey != null) {
      columnInfo.foreign_key = foreignKey;
    }

    return columnInfo;
  });
}

/*
  Link child tables based on foreignTables. 
*/
export function linkChildTables(schemaInfo: ISchemaInfo[]): ISchemaInfo[] {
  return schemaInfo.map((relationship) => {
    if (relationship.foreignTables) {
      relationship.foreignTables.forEach((foreignTable) => {
        const foreignRelationship = schemaInfo.find(
          (r) => r.tableName === foreignTable,
        );
        if (foreignRelationship) {
          foreignRelationship.childTables ??= [];
          foreignRelationship.childTables.push(relationship.tableName);
        }
      });
    }
    return relationship;
  });
}

/*
  Add pivot relationships for parent tables in belongsTo.
*/
export function addParentRelationships(
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] {
  schemaInfo.forEach((info) => {
    if (info.belongsTo != null) {
      info.belongsTo.forEach((parentTable) => {
        const parentTableInfo = schemaInfo.find(
          (schema) => schema.tableName === parentTable,
        );
        if (parentTableInfo) {
          const partnerTable = info.belongsTo?.find(
            (table) => table !== parentTable,
          );
          if (partnerTable != null) {
            parentTableInfo.pivotRelationships ??= [];
            parentTableInfo.pivotRelationships.push({
              relatedTable: partnerTable,
              pivotTable: info.tableName,
            });
          }
        }
      });
    }
  });

  return schemaInfo;
}

/*
  Determine unique foreign keys for one-to-one relationships.
*/
export const determineUniqueForeignKeys = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] => {
  schemaInfo.forEach((relationship) => {
    relationship.columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        const parentTable = schemaInfo.find(
          (rel) => rel.tableName === column.foreign_key?.foreign_table_name,
        );
        if (parentTable) {
          const isOneToOne = parentTable.hasOne?.includes(
            relationship.tableName,
          );
          if (isOneToOne === true) {
            column.unique = true;
          }
        }
      }
    });
  });

  return schemaInfo;
};

/*
  Combine all schema transformations and return final schema.
*/
export function addSchemaInfo(
  schemaInfo: ISchemaInfo[],
  data: ParsedJSONSchema | null = null,
): ISchemaInfo[] {
  const isIntrospection = data === null;

  if (!isIntrospection) {
    schemaInfo = addAssociations(schemaInfo, data);
  } else {
    schemaInfo = addAssociations(schemaInfo);
  }

  schemaInfo = linkChildTables(schemaInfo);
  schemaInfo = sortTablesBasedOnHierarchy(schemaInfo);
  schemaInfo = identifyPivotTables(schemaInfo);
  schemaInfo = addParentRelationships(schemaInfo);

  if (!isIntrospection) {
    schemaInfo = determineUniqueForeignKeys(schemaInfo);
  }
  return schemaInfo;
}

/*
  Main function: For each table, populate columns, detect relationships, and produce final schema.
*/
export function identifySchema(data: ParsedJSONSchema): ISchemaInfo[] {
  const schemaInfo: ISchemaInfo[] = Object.keys(data).map((tableName) => {
    const rows = data[tableName];
    const fields = populateFieldInfo(rows);
    const primaryKeyField = determinePrimaryKeyField(
      tableName,
      Object.keys(rows[0])[0],
    );
    const columnsInfo = createColumnsInfo({
      fields,
      rows,
      tableName,
      primaryKeyField,
    });

    /* Gather optional fields */
    const requiredColumns = getRequiredColumns(columnsInfo);
    const foreignTables = getForeignTables(columnsInfo);
    const foreignKeys = getForeignKeys(columnsInfo);

    /* Always include 'tableName' and 'columnsInfo' */
    const tableInfo: ISchemaInfo = {
      tableName,
      columnsInfo,
    };

    /* Only add properties if they have entries */
    if (requiredColumns.length > 0) {
      tableInfo.requiredColumns = requiredColumns;
    }
    if (foreignKeys.length > 0) {
      tableInfo.foreignKeys = foreignKeys;
    }
    if (foreignTables.length > 0) {
      tableInfo.foreignTables = foreignTables;
    }

    return tableInfo;
  });

  /* Add relationships and clean up schema */
  const enrichedSchema = addSchemaInfo(schemaInfo, data);
  return cleanUpSchemaInfo(enrichedSchema);
}

/*
  Remove empty arrays, undefined properties, or false booleans so the final data is "very flat".
*/
function cleanUpSchemaInfo(schemaInfo: ISchemaInfo[]): ISchemaInfo[] {
  return schemaInfo.map((item) => {
    // We only keep properties that have actual values
    const cleaned: ISchemaInfo = {
      tableName: item.tableName,
      columnsInfo: item.columnsInfo,
    };

    // Only add optional arrays if non-empty
    if (item.requiredColumns && item.requiredColumns.length > 0) {
      cleaned.requiredColumns = item.requiredColumns;
    }
    if (item.foreignKeys && item.foreignKeys.length > 0) {
      cleaned.foreignKeys = item.foreignKeys;
    }
    if (item.foreignTables && item.foreignTables.length > 0) {
      cleaned.foreignTables = item.foreignTables;
    }
    if (item.childTables && item.childTables.length > 0) {
      cleaned.childTables = item.childTables;
    }

    // Only add isPivot if true
    if (item.isPivot) {
      cleaned.isPivot = true;
    }

    // Only add these relationship arrays if non-empty
    if (item.hasOne && item.hasOne.length > 0) {
      cleaned.hasOne = item.hasOne;
    }
    if (item.hasMany && item.hasMany.length > 0) {
      cleaned.hasMany = item.hasMany;
    }
    if (item.belongsTo && item.belongsTo.length > 0) {
      cleaned.belongsTo = item.belongsTo;
    }
    if (item.belongsToMany && item.belongsToMany.length > 0) {
      cleaned.belongsToMany = item.belongsToMany;
    }
    if (item.pivotRelationships && item.pivotRelationships.length > 0) {
      cleaned.pivotRelationships = item.pivotRelationships;
    }

    return cleaned;
  });
}

export default identifySchema;
