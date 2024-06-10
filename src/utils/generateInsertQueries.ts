const generateInsertQueries = (data: Record<string, unknown[]>): string => {
  let insertions = '';

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

    insertions += `INSERT INTO "${tableName}" (${columnsNames}) VALUES
  ${values};\n\n`;
  });

  return insertions;
};

export default generateInsertQueries;
