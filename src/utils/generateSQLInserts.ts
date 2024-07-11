const generateSQLInserts = (
  data: Record<string, Record<string, unknown>[]>,
): string => {
  let inserts = '';

  Object.entries(data).forEach(([tableName, records]) => {
    if (records.length === 0) {
      return;
    }

    const firstRecord = records[0];
    const columnNames = Object.keys(firstRecord).join(', ');

    const values = records
      .map((record) => {
        const valueStrings = Object.values(record).map((value) => {
          if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
          }
          if (value === null) {
            return 'NULL';
          }
          if (value instanceof Date) {
            return `'${value.toISOString()}'`;
          }
          return value;
        });

        return `(${valueStrings.join(', ')})`;
      })
      .join(',\n');

    inserts += `INSERT INTO "${tableName}" (${columnNames}) VALUES ${values};\n`;
  });

  return inserts;
};

export default generateSQLInserts;
