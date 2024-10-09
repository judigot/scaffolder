import {
  IColumnInfo,
  ISchemaInfo,
  ParsedJSONSchema,
} from '@/interfaces/interfaces';
import convertType from './convertType';
import identifyTSPrimitiveType from './identifyTSPrimitiveType';
import pluralize from 'pluralize';
import {
  getForeignKeys,
  getForeignTables,
  getRequiredColumns,
} from '@/utils/convertIntrospectedStructure';

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

export function identifyPivotTables(schemaInfo: ISchemaInfo[]): ISchemaInfo[] {
  return schemaInfo.map((relationship) => {
    relationship.isPivot = isJunctionTable(relationship, schemaInfo);

    return relationship;
  });
}

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
export const isJunctionTable = (
  relationship: ISchemaInfo,
  schemaInfo: ISchemaInfo[],
): boolean => {
  // Get all foreign keys in the table
  const foreignKeys = relationship.columnsInfo.filter(
    (column) => column.foreign_key,
  );

  // Check if the table has exactly two foreign keys
  if (foreignKeys.length === 2) {
    const [firstKey, secondKey] = foreignKeys;

    // Find the parent tables based on foreign keys
    const parentTable1 = schemaInfo.find(
      (rel) => rel.table === firstKey.foreign_key?.foreign_table_name,
    );
    const parentTable2 = schemaInfo.find(
      (rel) => rel.table === secondKey.foreign_key?.foreign_table_name,
    );

    // Check if the table has no child tables
    const hasNoChildTables = relationship.childTables.length === 0;

    // Ensure both parent tables are defined before checking name combination
    if (parentTable1 && parentTable2) {
      const isNameCombination =
        relationship.table === `${parentTable1.table}_${parentTable2.table}` ||
        relationship.table === `${parentTable2.table}_${parentTable1.table}`;

      // Return true if the table name matches the combination rule and has no child tables
      return hasNoChildTables && isNameCombination;
    }
  }

  return false;
};

// Function to add relationship info to schema
export const addAssociations = (
  schemaInfo: ISchemaInfo[],
  data: ParsedJSONSchema | null = null,
): ISchemaInfo[] => {
  const isIntrospection = data === null;
  const tempSchemaInfo = schemaInfo.map((relationship) => ({
    ...relationship,
    hasOne: [...relationship.hasOne],
    hasMany: [...relationship.hasMany],
    belongsTo: [...relationship.belongsTo],
    belongsToMany: [...relationship.belongsToMany],
  }));

  // Helper function to handle belongsToMany relationships
  const handleBelongsToMany = (relationship: ISchemaInfo) => {
    const foreignKeys = relationship.columnsInfo.filter(
      (col) => col.foreign_key,
    );

    if (foreignKeys.length === 2) {
      const table1 = tempSchemaInfo.find(
        (rel) => rel.table === foreignKeys[0].foreign_key?.foreign_table_name,
      );
      const table2 = tempSchemaInfo.find(
        (rel) => rel.table === foreignKeys[1].foreign_key?.foreign_table_name,
      );

      if (table1 && table2) {
        table1.belongsToMany = Array.from(
          new Set([...table1.belongsToMany, table2.table]),
        );
        table2.belongsToMany = Array.from(
          new Set([...table2.belongsToMany, table1.table]),
        );
      }
    }
  };

  tempSchemaInfo.forEach((relationship) => {
    const rows = data ? data[relationship.table] : [];

    relationship.columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        const parentTable = tempSchemaInfo.find(
          (rel) => rel.table === column.foreign_key?.foreign_table_name,
        );
        if (parentTable) {
          relationship.belongsTo = Array.from(
            new Set([...relationship.belongsTo, parentTable.table]),
          );

          if (!isIntrospection) {
            if (detectOneToManyRelationship(rows, column.column_name)) {
              parentTable.hasMany = Array.from(
                new Set([...parentTable.hasMany, relationship.table]),
              );
            } else if (!isJunctionTable(relationship, schemaInfo)) {
              parentTable.hasOne = Array.from(
                new Set([...parentTable.hasOne, relationship.table]),
              );
            }
          } else {
            const foreignTable = tempSchemaInfo.find((rel) =>
              rel.columnsInfo.some(
                (col) =>
                  col.primary_key && col.column_name === column.column_name,
              ),
            );
            if (foreignTable) {
              if (!column.unique) {
                foreignTable.hasMany = Array.from(
                  new Set([...foreignTable.hasMany, relationship.table]),
                );
              } else if (!isJunctionTable(relationship, schemaInfo)) {
                foreignTable.hasOne = Array.from(
                  new Set([...foreignTable.hasOne, relationship.table]),
                );
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

// Function to perform topological sorting based on table hierarchy
export const sortTablesBasedOnHierarchy = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] => {
  if (isAlreadySorted(schemaInfo)) {
    return schemaInfo; /* Return the original array if already sorted */
  }

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
export const isAlreadySorted = (schemaInfo: ISchemaInfo[]): boolean => {
  return schemaInfo.every((relationship, i) =>
    relationship.childTables.every(
      (childTable) => schemaInfo.findIndex((r) => r.table === childTable) > i,
    ),
  );
};

// Helper function to create column information
const createColumnsInfo = ({
  fields,
  rows,
  table,
  primaryKeyField,
}: {
  fields: Record<string, IFieldInfo>;
  rows: Record<string, unknown>[];
  table: string;
  primaryKeyField: string;
}): IColumnInfo[] => {
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
        ? // ? `nextval('${table}_${key}_seq'::regclass)`
          `AUTO_INCREMENT`
        : null,
      primary_key: isPrimaryKey,
      unique: isUnique,
      foreign_key: foreignKey,
    };
  });
};

// Helper function to link child tables
export function linkChildTables(schemaInfo: ISchemaInfo[]): ISchemaInfo[] {
  return schemaInfo.map((relationship) => {
    relationship.foreignTables.map((foreignTable) => {
      const foreignRelationship = schemaInfo.find(
        (r) => r.table === foreignTable,
      );
      if (foreignRelationship) {
        foreignRelationship.childTables.push(relationship.table);
      }
    });
    return relationship;
  });
}

export function addParentRelationships(
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] {
  schemaInfo.forEach((info) => {
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
  });

  return schemaInfo;
}

export const determineUniqueForeignKeys = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] => {
  schemaInfo.forEach((relationship) => {
    relationship.columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        // Find the parent table that this foreign key references
        const parentTable = schemaInfo.find(
          (rel) => rel.table === column.foreign_key?.foreign_table_name,
        );

        if (parentTable) {
          // Check if the parent table has a `hasOne` relationship with the current table
          const isOneToOne = parentTable.hasOne.includes(relationship.table);

          // If the relationship is one-to-one, mark the foreign key as unique
          if (isOneToOne) {
            column.unique = true;
          }
        }
      }
    });
  });

  return schemaInfo;
};

export function convertToCases(input: string) {
  const words = input.replace(/[_-]/g, ' ').trim().split(/\s+/);
  const pluralWords = [
    ...words.slice(0, -1),
    pluralize(words[words.length - 1]),
  ];

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  const joinWords = (arr: string[], separator: string) =>
    arr.join(separator).toLowerCase();
  const titleCase = (arr: string[]) => arr.map(capitalize).join(' ');

  return {
    plural: pluralize(input),
    titleCase: titleCase(words),
    sentenceCase: capitalize(joinWords(words, ' ')),
    phraseCase: joinWords(words, ' '),
    pascalCase: words.map(capitalize).join(''),
    camelCase: words[0].toLowerCase() + words.slice(1).map(capitalize).join(''),
    kebabCase: joinWords(words, '-'),
    snakeCase: joinWords(words, '_'),
    titleCasePlural: titleCase(pluralWords),
    sentenceCasePlural: capitalize(joinWords(pluralWords, ' ')),
    phraseCasePlural: joinWords(pluralWords, ' '),
    pascalCasePlural: pluralWords.map(capitalize).join(''),
    camelCasePlural:
      pluralWords[0].toLowerCase() +
      pluralWords.slice(1).map(capitalize).join(''),
    kebabCasePlural: joinWords(pluralWords, '-'),
    snakeCasePlural: joinWords(pluralWords, '_'),
  };
}

function addTableNameCases(schemaInfo: ISchemaInfo[]): ISchemaInfo[] {
  return schemaInfo.map((info) => {
    info.tableCases = convertToCases(info.table);
    return info;
  });
}

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
  schemaInfo = addTableNameCases(schemaInfo);

  if (!isIntrospection) {
    schemaInfo = determineUniqueForeignKeys(schemaInfo);
  }
  return schemaInfo;
}

function identifySchema(data: ParsedJSONSchema): ISchemaInfo[] {
  let schemaInfo: ISchemaInfo[] = Object.keys(data).map((table) => {
    const rows = data[table];
    const fields = populateFieldInfo(rows);
    const primaryKeyField = determinePrimaryKeyField(
      table,
      Object.keys(rows[0])[0],
    );

    const columnsInfo = createColumnsInfo({
      fields,
      rows,
      table,
      primaryKeyField,
    });

    const requiredColumns = getRequiredColumns(columnsInfo);
    const foreignTables = getForeignTables(columnsInfo);
    const foreignKeys = getForeignKeys(columnsInfo);

    return {
      table,
      tableCases: {
        plural: '',
        titleCase: '',
        sentenceCase: '',
        phraseCase: '',
        pascalCase: '',
        camelCase: '',
        kebabCase: '',
        snakeCase: '',
        titleCasePlural: '',
        sentenceCasePlural: '',
        phraseCasePlural: '',
        pascalCasePlural: '',
        camelCasePlural: '',
        kebabCasePlural: '',
        snakeCasePlural: '',
      },
      tablePlural: pluralize(table),
      requiredColumns,
      columnsInfo,
      foreignTables,
      foreignKeys,
      isPivot: false,
      childTables: [],
      hasOne: [],
      hasMany: [],
      belongsTo: [],
      belongsToMany: [],
      pivotRelationships: [],
    };
  });

  schemaInfo = addSchemaInfo(schemaInfo, data);

  return schemaInfo;
}

export default identifySchema;
