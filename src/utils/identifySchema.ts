interface IFieldInfo {
  types: Set<string>;
  nullable: boolean;
}

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

const uniqueColumnNames = [
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
  'vin', // Vehicle Identification Number
  'registration_number',
  'tracking_number',
];

const populateFieldInfo = (
  records: Record<string, unknown>[],
): Record<string, IFieldInfo> => {
  const fields: Record<string, IFieldInfo> = {};

  records.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      if (!(key in fields)) {
        fields[key] = { types: new Set<string>(), nullable: false };
      }
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

const determinePrimaryKeyField = (
  tableName: string,
  firstKey: string,
): string => {
  return firstKey.includes('id') ? firstKey : `${tableName}_id`;
};

const detectOneToManyRelationship = (
  rows: Record<string, unknown>[],
  foreignKey: string,
): boolean => {
  const foreignKeyCounts: Record<string, number> = {};

  rows.forEach((row) => {
    const value = String(row[foreignKey]);
    if (foreignKeyCounts[value]) {
      foreignKeyCounts[value]++;
    } else {
      foreignKeyCounts[value] = 1;
    }
  });

  return Object.values(foreignKeyCounts).some((count) => count > 1);
};

const isJunctionTable = (
  relationship: ISchemaInfo,
  schemaInfo: ISchemaInfo[],
): boolean => {
  const foreignKeys = relationship.columnsInfo.filter((column) => column.foreign_key);
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

export const addRelationshipInfo = (
  schemaInfo: ISchemaInfo[],
  data?: Record<string, Record<string, unknown>[]>,
): void => {
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

    // Handle belongsToMany relationships
    if (isJunctionTable(relationship, schemaInfo)) {
      const foreignKeys = relationship.columnsInfo.filter(col => col.foreign_key);

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
    }

    // Remove duplicates
    relationship.hasOne = Array.from(new Set(relationship.hasOne));
    relationship.hasMany = Array.from(new Set(relationship.hasMany));
    relationship.belongsTo = Array.from(new Set(relationship.belongsTo));
    relationship.belongsToMany = Array.from(new Set(relationship.belongsToMany));
  });
};



// Topological sort to determine the correct order of tables
const sortTablesBasedOnHierarchy = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] => {
  const sorted: ISchemaInfo[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  const visit = (table: ISchemaInfo) => {
    if (temp.has(table.table)) {
      throw new Error('Cyclic dependency detected');
    }
    if (!visited.has(table.table)) {
      temp.add(table.table);
      table.childTables.forEach((childTable) => {
        const childRelationship = schemaInfo.find(
          (r) => r.table === childTable,
        );
        if (childRelationship) {
          visit(childRelationship);
        }
      });
      temp.delete(table.table);
      visited.add(table.table);
      sorted.push(table);
    }
  };

  schemaInfo.forEach((table) => {
    if (!visited.has(table.table)) {
      visit(table);
    }
  });

  return sorted.reverse(); // Reverse to get the correct order
};

const isAlreadySorted = (schemaInfo: ISchemaInfo[]): boolean => {
  for (const [i, relationship] of schemaInfo.entries()) {
    for (const childTable of relationship.childTables) {
      const childIndex = schemaInfo.findIndex((r) => r.table === childTable);
      if (childIndex <= i) {
        return false;
      }
    }
  }
  return true;
};

function identifySchema(
  data: Record<string, Record<string, unknown>[]>,
): ISchemaInfo[] {
  let schemaInfo: ISchemaInfo[] = [];

  for (const table in data) {
    if (table in data) {
      const foreignTables: string[] = [];
      const foreignKeys: string[] = [];
      const columnsInfo: IColumnInfo[] = [];
      const requiredColumns: string[] = [];
      const rows = data[table];

      if (rows.length > 0) {
        const fields = populateFieldInfo(rows);
        const primaryKeyField = determinePrimaryKeyField(
          table,
          Object.keys(rows[0])[0],
        );

        for (const key in fields) {
          if (key in fields) {
            const sampleValue = rows.find((record) => record[key] !== null)?.[
              key
            ];
            const fieldType = convertType({
              value: sampleValue,
              targetType: 'typescript',
            });
            const isPrimaryKey = key === primaryKeyField;
            const isUnique = uniqueColumnNames.includes(key) && !isPrimaryKey;
            const foreignKey =
              key.endsWith('_id') && key !== `${table}_id`
                ? {
                    foreign_table_name: key.replace('_id', ''),
                    foreign_column_name: key,
                  }
                : null;

            const columnInfo = {
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

            if (!fields[key].nullable) {
              requiredColumns.push(key);
            }

            if (foreignKey) {
              foreignTables.push(foreignKey.foreign_table_name);
              foreignKeys.push(key);
            }

            columnsInfo.push(columnInfo);
          }
        }
      }

      schemaInfo.push({
        table,
        requiredColumns,
        columnsInfo,
        foreignTables: Array.from(new Set(foreignTables)),
        foreignKeys: Array.from(new Set(foreignKeys)),
        childTables: [],
        hasOne: [],
        hasMany: [],
        belongsTo: [],
        belongsToMany: [],
      });
    }
  }

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

  addRelationshipInfo(schemaInfo, data);

  if (!isAlreadySorted(schemaInfo)) {
    schemaInfo = sortTablesBasedOnHierarchy(schemaInfo);
  }

  return schemaInfo;
}

export default identifySchema;
