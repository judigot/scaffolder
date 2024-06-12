function identifyRelationships(tableInfo: Record<string, unknown[]>) {
  const relationships: {
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
            relationships.push({ table, foreignTable, foreignKey });
          }
        });
      }
    });
  });

  return relationships;
}

export default identifyRelationships;
