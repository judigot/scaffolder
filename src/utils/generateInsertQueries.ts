const generateSQLInsertQueries = (data: Record<string, unknown[]>) => {
  let inserts = '';

  Object.entries(data).forEach(([tableName, records]) => {
    if (records.length === 0) {
      return;
    }

    const firstRecord = records[0] as Record<string, unknown>;
    const columnsNames = Object.keys(firstRecord).join(', ');

    const values = records
      .map((record) => {
        const typedRecord = record as Record<string, unknown>;
        const valueString = Object.values(typedRecord)
          .map((value) =>
            typeof value === 'string'
              ? `'${value.replace(/'/g, "''")}'`
              : value === null
                ? 'NULL'
                : String(value),
          )
          .join(', ');
        return `(${valueString})`;
      })
      .join(',\n');

    inserts += `INSERT INTO "${tableName}" (${columnsNames}) VALUES ${values};`;
  });

  return inserts;
};

export default generateSQLInsertQueries;
