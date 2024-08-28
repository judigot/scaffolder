import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import convertType from './convertType';
import identifyTSPrimitiveType from './identifyTSPrimitiveType';

/* Relationship Rules:

HasMany Rules:
  - Use `hasMany` when the current table (parent table) has a one-to-many relationship with another table (child table).
  - Applicable when the foreign key in the child table references the primary key in the parent table, and the foreign key can appear multiple times in the child table.

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

// Constants
const UNIQUE_COLUMN_NAMES = [
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

// Function to populate field information
const populateFieldInfo = (
  records: Record<string, unknown>[],
): Record<string, IFieldInfo> => {
  const fields: Record<string, IFieldInfo> = {};

  records.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      fields[key] = { types: new Set<string>(), nullable: false };
      fields[key].types.add(
        value === null ? 'null' : identifyTSPrimitiveType(value),
      );
      if (value === null) fields[key].nullable = true;
    });
  });

  return fields;
};

// Function to determine the primary key field
const determinePrimaryKeyField = (
  tableName: string,
  firstKey: string,
): string => {
  return firstKey.includes('id') ? firstKey : `${tableName}_id`;
};

// Function to detect one-to-many relationships
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

// Function to check if a table is a junction table (pivot table)
const isJunctionTable = (
  relationship: ISchemaInfo,
  schemaInfo: ISchemaInfo[],
): boolean => {
  const foreignKeys = relationship.columnsInfo.filter(
    (column) => column.foreign_key,
  );
  if (foreignKeys.length === 2) {
    const [firstKey, secondKey] = foreignKeys;
    const parentTable1 = schemaInfo.find(
      (rel) => rel.table === firstKey.foreign_key?.foreign_table_name,
    );
    const parentTable2 = schemaInfo.find(
      (rel) => rel.table === secondKey.foreign_key?.foreign_table_name,
    );
    return parentTable1 !== undefined && parentTable2 !== undefined;
  }
  return false;
};

// Function to add relationship info to schema
export const addRelationshipInfo = (
  schemaInfo: ISchemaInfo[],
  data?: Record<string, Record<string, unknown>[]>,
) => {
  schemaInfo.forEach((relationship) => {
    const rows = data ? data[relationship.table] : [];

    relationship.columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        const parentTable = schemaInfo.find(
          (rel) => rel.table === column.foreign_key?.foreign_table_name,
        );
        if (parentTable) {
          relationship.belongsTo.push(parentTable.table);

          if (data && detectOneToManyRelationship(rows, column.column_name)) {
            parentTable.hasMany.push(relationship.table);
          } else if (!isJunctionTable(relationship, schemaInfo)) {
            parentTable.hasOne.push(relationship.table);
          }
        }
      }
    });

    if (isJunctionTable(relationship, schemaInfo)) {
      handleBelongsToMany(relationship, schemaInfo);
    }

    // Remove duplicates from relationships
    relationship.hasOne = Array.from(new Set(relationship.hasOne));
    relationship.hasMany = Array.from(new Set(relationship.hasMany));
    relationship.belongsTo = Array.from(new Set(relationship.belongsTo));
    relationship.belongsToMany = Array.from(
      new Set(relationship.belongsToMany),
    );
  });
};

// Helper function to handle belongsToMany relationships
const handleBelongsToMany = (
  relationship: ISchemaInfo,
  schemaInfo: ISchemaInfo[],
) => {
  const foreignKeys = relationship.columnsInfo.filter((col) => col.foreign_key);

  if (foreignKeys.length === 2) {
    const table1 = schemaInfo.find(
      (rel) => rel.table === foreignKeys[0].foreign_key?.foreign_table_name,
    );
    const table2 = schemaInfo.find(
      (rel) => rel.table === foreignKeys[1].foreign_key?.foreign_table_name,
    );

    if (table1 && table2) {
      table1.belongsToMany.push(table2.table);
      table2.belongsToMany.push(table1.table);
    }
  }
};

// Function to perform topological sorting based on table hierarchy
const sortTablesBasedOnHierarchy = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] => {
  const sorted: ISchemaInfo[] = [];
  const visited = new Set<string>();

  const visit = (table: ISchemaInfo) => {
    if (visited.has(table.table)) return;
    visited.add(table.table);
    table.childTables.forEach((childTable) => {
      const childRelationship = schemaInfo.find((r) => r.table === childTable);
      if (childRelationship) visit(childRelationship);
    });
    sorted.push(table);
  };

  schemaInfo.forEach((table) => {
    visit(table);
  });
  return sorted.reverse();
};

// Function to check if schema is already sorted
const isAlreadySorted = (schemaInfo: ISchemaInfo[]): boolean => {
  return schemaInfo.every((relationship, i) =>
    relationship.childTables.every(
      (childTable) => schemaInfo.findIndex((r) => r.table === childTable) > i,
    ),
  );
};

// Helper function to create column information
const createColumnsInfo = (
  fields: Record<string, IFieldInfo>,
  rows: Record<string, unknown>[],
  table: string,
  primaryKeyField: string,
): IColumnInfo[] => {
  return Object.keys(fields).map((key) => {
    const sampleValue = rows.find((record) => record[key] !== null)?.[key];
    const fieldType = convertType({
      value: sampleValue,
      targetType: 'typescript',
    });
    const isPrimaryKey = key === primaryKeyField;
    const isUnique = UNIQUE_COLUMN_NAMES.includes(key) && !isPrimaryKey;
    const foreignKey =
      key.endsWith('_id') && key !== `${table}_id`
        ? {
            foreign_table_name: key.replace('_id', ''),
            foreign_column_name: key,
          }
        : null;

    return {
      column_name: key,
      data_type: fieldType,
      is_nullable: fields[key].nullable ? 'YES' : 'NO',
      column_default: isPrimaryKey
        ? `nextval('${table}_${key}_seq'::regclass)`
        : null,
      primary_key: isPrimaryKey,
      unique: isUnique,
      foreign_key: foreignKey,
    };
  });
};

const extractForeignTables = (columnsInfo: IColumnInfo[]): string[] => {
  return Array.from(
    new Set(
      columnsInfo
        .filter((col) => col.foreign_key)
        .map((col) => col.foreign_key?.foreign_table_name)
        .filter((name): name is string => name !== undefined),
    ),
  );
};

// Helper function to extract foreign keys from columns
const extractForeignKeys = (columnsInfo: IColumnInfo[]): string[] => {
  return Array.from(
    new Set(
      columnsInfo
        .filter((col) => col.foreign_key)
        .map((col) => col.column_name),
    ),
  );
};

// Helper function to link child tables
const linkChildTables = (schemaInfo: ISchemaInfo[]) => {
  schemaInfo.forEach((relationship) => {
    relationship.foreignTables.forEach((foreignTable) => {
      const foreignRelationship = schemaInfo.find(
        (r) => r.table === foreignTable,
      );
      if (foreignRelationship) {
        foreignRelationship.childTables.push(relationship.table);
      }
    });
  });
};

function addPivotRelationships(schemaInfo: ISchemaInfo[]): ISchemaInfo[] {
  schemaInfo.forEach((info) => {
    if (info.isPivot) {
      // Iterate over the parent tables in 'belongsTo' to set their pivot relationships
      info.belongsTo.forEach((parentTable) => {
        const parentTableInfo = schemaInfo.find(
          (schema) => schema.table === parentTable,
        );

        if (parentTableInfo) {
          // Identify the other parent table in the pivot relationship
          const partnerTable = info.belongsTo.find(
            (table) => table !== parentTable,
          );

          if (partnerTable != null) {
            parentTableInfo.pivotRelationships.push({
              relatedTable: partnerTable,
              pivotTable: info.table,
            });
          }
        }
      });
    }
  });

  return schemaInfo;
}

// Main function to identify schema relationships
function identifySchema(
  data: Record<string, Record<string, unknown>[]>,
): ISchemaInfo[] {
  let schemaInfo: ISchemaInfo[] = Object.keys(data).map((table) => {
    const rows = data[table];
    const fields = populateFieldInfo(rows);
    const primaryKeyField = determinePrimaryKeyField(
      table,
      Object.keys(rows[0])[0],
    );
    const columnsInfo = createColumnsInfo(fields, rows, table, primaryKeyField);

    return {
      table,
      requiredColumns: Object.keys(fields).filter(
        (key) => !fields[key].nullable,
      ),
      columnsInfo,
      foreignTables: extractForeignTables(columnsInfo),
      foreignKeys: extractForeignKeys(columnsInfo),
      isPivot: false,
      childTables: [],
      hasOne: [],
      hasMany: [],
      belongsTo: [],
      belongsToMany: [],
      pivotRelationships: [],
    };
  });

  // Determine if each table is a junction table and set the isPivot property
  schemaInfo.forEach((relationship) => {
    relationship.isPivot = isJunctionTable(relationship, schemaInfo);
  });

  // Link relationships between tables
  linkChildTables(schemaInfo);
  addRelationshipInfo(schemaInfo, data);

  // Sort tables based on hierarchy
  if (!isAlreadySorted(schemaInfo)) {
    schemaInfo = sortTablesBasedOnHierarchy(schemaInfo);
  }

  schemaInfo = addPivotRelationships(schemaInfo);

  return schemaInfo;
}

export default identifySchema;
