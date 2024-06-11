import mapTypeToSQL from './mapTypeToSQL';

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
  'name',
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

const generateSQLSchema = (data: Record<string, unknown[]>): string => {
  const schemaParts: string[] = [];

  Object.entries(data as Record<string, Record<string, unknown>[]>).forEach(
    ([tableName, records]) => {
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
      const columns = Object.entries(fields)
        .map(([key, { types, nullable }]) => {
          const type =
            key === primaryKeyField
              ? 'BIGSERIAL'
              : key.endsWith('_id')
                ? 'BIGINT'
                : mapTypeToSQL([...types][0], records[0][key]);
          const nullableString = nullable ? 'NULL' : 'NOT NULL';
          const uniqueString =
            uniqueColumnNames.includes(key) && !nullable ? ' UNIQUE' : '';
          return `  ${key} ${type}${uniqueString} ${nullableString}`.trim();
        })
        .join(',\n');

      const primaryKey = `  PRIMARY KEY (${primaryKeyField})`;

      const foreignKeys = Object.entries(fields)
        .filter(([key]) => key.endsWith('_id') && key !== primaryKeyField)
        .map(([key]) => {
          const referencedTable = key.slice(0, -3);
          return `  CONSTRAINT FK_${tableName}_${key} FOREIGN KEY (${key}) REFERENCES ${quoteTableName(
            referencedTable,
          )}(${key})`;
        })
        .join(',\n');

      const uniqueConstraints = Object.entries(fields)
        .filter(
          ([key, { nullable }]) => uniqueColumnNames.includes(key) && !nullable,
        )
        .map(([key]) => `  UNIQUE (${key})`)
        .join(',\n');

      const dropTableQuery = `DROP TABLE IF EXISTS ${quotedTableName} CASCADE;`;

      const createTableQuery = `CREATE TABLE ${quotedTableName} (\n${columns},\n${primaryKey}${foreignKeys ? ',\n' + foreignKeys : ''}${uniqueConstraints ? ',\n' + uniqueConstraints : ''}\n);`;

      schemaParts.push(`${dropTableQuery}\n\n${createTableQuery}`);
    },
  );

  return schemaParts.join('\n\n');
};

export default generateSQLSchema;
