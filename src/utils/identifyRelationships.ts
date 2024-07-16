import convertType from './convertType';
import identifyType from './identifyType';

export interface IColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  primary_key: boolean;
  unique: boolean;
  foreign_key: {
    foreign_table_name: string;
    foreign_column_name: string;
  } | null;
}

export interface IRelationshipInfo {
  table: string;
  requiredColumns: string[];
  columnsInfo: IColumnInfo[];
  foreignTables: string[];
  foreignKeys: string[];
  childTables: string[];
}

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
      fields[key].types.add(value === null ? 'null' : identifyType(value));
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

function identifyRelationships(
  data: Record<string, Record<string, unknown>[]>,
): IRelationshipInfo[] {
  const relationships: IRelationshipInfo[] = [];

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

      relationships.push({
        table,
        requiredColumns,
        columnsInfo,
        foreignTables: Array.from(new Set(foreignTables)),
        foreignKeys: Array.from(new Set(foreignKeys)),
        childTables: [], // Initialize childTables as an empty array
      });
    }
  }

  relationships.forEach((relationship) => {
    relationship.foreignTables.forEach((foreignTable) => {
      const foreignRelationship = relationships.find(
        (r) => r.table === foreignTable,
      );
      if (foreignRelationship) {
        foreignRelationship.childTables.push(relationship.table);
      }
    });
  });

  relationships.forEach((relationship) => {
    relationship.childTables = Array.from(new Set(relationship.childTables));
  });

  return relationships;
}

export default identifyRelationships;
