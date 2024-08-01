import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import convertType from './convertType';
import identifyTSPrimitiveType from './identifyTSPrimitiveType';

interface IFieldInfo {
  types: Set<string>;
  nullable: boolean;
}

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

const isJunctionTable = (
  _table: string,
  columnsInfo: IColumnInfo[],
  schemaInfo: ISchemaInfo[],
): boolean => {
  const foreignKeys = columnsInfo.filter((column) => column.foreign_key);
  return (
    foreignKeys.length === 2 &&
    foreignKeys.every((key) =>
      schemaInfo.some(
        (rel) =>
          rel.table === key.foreign_key?.foreign_table_name &&
          rel.columnsInfo.some(
            (col) =>
              col.column_name === key.foreign_key?.foreign_column_name &&
              col.foreign_key === null,
          ),
      ),
    )
  );
};

export const addHasOneOrMany = (schemaInfo: ISchemaInfo[]): void => {
  schemaInfo.forEach((relationship) => {
    relationship.childTables = Array.from(new Set(relationship.childTables));
    relationship.childTables.forEach((childTable) => {
      const childRelationship = schemaInfo.find(
        (rel) => rel.table === childTable,
      );
      if (childRelationship) {
        if (
          isJunctionTable(childTable, childRelationship.columnsInfo, schemaInfo)
        ) {
          relationship.hasMany.push(childTable);
        } else {
          relationship.hasOne.push(childTable);
        }
      }
    });
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

function identifyRelationships(
  data: Record<string, Record<string, unknown>[]>,
): ISchemaInfo[] {
  const schemaInfo: ISchemaInfo[] = [];

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

  addHasOneOrMany(schemaInfo);

  if (!isAlreadySorted(schemaInfo)) {
    return sortTablesBasedOnHierarchy(schemaInfo);
  }

  return schemaInfo;
}

export default identifyRelationships;