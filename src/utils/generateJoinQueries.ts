function generateJoinQueries(tableInfo: Record<string, unknown[]>) {
  const joins: {
    sourceTable: string;
    targetTable: string;
    foreignKey: string;
  }[] = [];

  const tableNames = Object.keys(tableInfo);

  tableNames.forEach((sourceTable) => {
    const sourceColumns = Object.keys(
      tableInfo[sourceTable][0] as Record<string, unknown>,
    );

    sourceColumns.forEach((column) => {
      if (column.endsWith('_id')) {
        tableNames.forEach((targetTable) => {
          if (
            targetTable !== sourceTable &&
            Object.prototype.hasOwnProperty.call(
              tableInfo[targetTable][0] as Record<string, unknown>,
              column,
            )
          ) {
            joins.push({ targetTable, sourceTable, foreignKey: column });
          }
        });
      }
    });
  });

  const joinQueries = joins.map((join) => {
    return `SELECT * FROM "${join.sourceTable}" JOIN "${join.targetTable}" ON "${join.sourceTable}".${join.foreignKey} = "${join.targetTable}".${join.foreignKey};`;
  });

  return joinQueries;
}

export default generateJoinQueries;
