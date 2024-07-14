import convertType from './convertType';
import { IRelationshipInfo } from './identifyRelationships';

interface IFieldInfo {
  types: Set<string>;
  nullable: boolean;
}

const quoteTableName = (tableName: string): string => `"${tableName}"`;

// Common column names that should be unique
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

const generateSQLSchema = (
  data: Record<string, Record<string, unknown>[]>,
  relationships: IRelationshipInfo[],
): string => {
  const schemaParts: string[] = [];

  Object.entries(data).forEach(([tableName, records]) => {
    const fields: Record<string, IFieldInfo> = {};

    // Populate field info
    records.forEach((record) => {
      Object.entries(record).forEach(([key, value]) => {
        if (!(key in fields)) {
          fields[key] = { types: new Set<string>(), nullable: false };
        }
        fields[key].types.add(value === null ? 'null' : typeof value);
        if (value === null) {
          fields[key].nullable = true;
        }
      });
    });

    // Determine primary key
    const firstKey = Object.keys(records[0])[0];
    const primaryKeyField = firstKey.includes('id')
      ? firstKey
      : `${tableName}_id`;

    const quotedTableName = quoteTableName(tableName);
    const columns = Object.entries(fields).map(([columnName, { nullable }]) => {
      const type = (() => {
        if (columnName === primaryKeyField) {
          return 'BIGSERIAL PRIMARY KEY';
        }

        if (columnName.endsWith('_id')) {
          return 'BIGINT';
        }

        if (columnName.toLowerCase().includes('password')) {
          return 'CHAR(60)';
        }

        return convertType({
          value: records[0][columnName],
          targetType: 'postgresql',
        });
      })();
      const nullableString =
        columnName === primaryKeyField ? '' : nullable ? '' : 'NOT NULL'; // Avoid adding NULL for default
      const uniqueString =
        uniqueColumnNames.includes(columnName) && columnName !== primaryKeyField
          ? 'UNIQUE'
          : '';
      return `  ${columnName} ${type} ${uniqueString} ${nullableString}`.trim();
    });

    const tableRelationships = relationships.find(
      (rel) => rel.table === tableName,
    );
    const foreignKeys = tableRelationships?.foreignKeys.map((key) => {
      // Determine referenced table from relationships
      const referencedTable =
        tableRelationships.foreignTables.find((table) =>
          key.startsWith(table),
        ) ?? key.slice(0, -3);

      return `  CONSTRAINT FK_${tableName}_${key} FOREIGN KEY (${key}) REFERENCES ${quoteTableName(
        referencedTable,
      )}(${key})`;
    });

    const allColumnsAndKeys = [...columns, ...(foreignKeys ?? [])].join(',\n');

    const dropTableQuery = `DROP TABLE IF EXISTS ${quotedTableName} CASCADE;`;

    const createTableQuery = `CREATE TABLE ${quotedTableName} (\n${allColumnsAndKeys}\n);`;

    schemaParts.push(`${dropTableQuery}\n${createTableQuery}`);
  });

  return schemaParts.join('\n');
};

export default generateSQLSchema;
