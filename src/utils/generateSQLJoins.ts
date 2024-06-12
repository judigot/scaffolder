function generateSQLJoins(tableInfo: Record<string, unknown[]>) {
  const joins: {
    table: string;
    foreignTable: string;
    foreignKey: string;
  }[] = [];

  const tableNames = Object.keys(tableInfo);

  tableNames.forEach((foreignTable) => {
    const sourceColumns = Object.keys(
      tableInfo[foreignTable][0] as Record<string, unknown>,
    );

    sourceColumns.forEach((column) => {
      if (column.endsWith('_id')) {
        const foreignKey: string = column;
        tableNames.forEach((table) => {
          if (
            table !== foreignTable &&
            Object.prototype.hasOwnProperty.call(
              tableInfo[table][0] as Record<string, unknown>,
              foreignKey,
            )
          ) {
            joins.push({ table, foreignTable, foreignKey });
          }
        });
      }
    });
  });

  const joinQueries = joins.map((join) => {
    return `SELECT * FROM "${join.foreignTable}" JOIN "${join.table}" ON "${join.foreignTable}".${join.foreignKey} = "${join.table}".${join.foreignKey};`;
  });

  return joinQueries;
}

export default generateSQLJoins;
