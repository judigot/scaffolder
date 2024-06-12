interface IRelationshipInfo {
  table: string;
  foreignTables: string[];
  foreignKeys: string[];
}
function identifyRelationships(tableInfo: Record<string, string | string[]>): {
  table: string;
  foreignTables: string[];
  foreignKeys: string[];
}[] {
  const relationships: IRelationshipInfo[] = [];
  const tableNames = Object.keys(tableInfo);

  tableNames.forEach((foreignTable) => {
    const foreignKeyColumns = Object.keys(tableInfo[foreignTable][0]).filter(
      (column) => column.endsWith('_id'),
    );

    const otherTables = tableNames.filter((table) => table !== foreignTable);

    otherTables.forEach((table) => {
      const tableColumns = tableInfo[table][0];

      foreignKeyColumns.forEach((foreignKey) => {
        const hasForeignKey = Object.prototype.hasOwnProperty.call(
          tableColumns,
          foreignKey,
        );

        if (hasForeignKey) {
          relationships.push({
            table,
            foreignTables: [foreignTable],
            foreignKeys: [foreignKey],
          });
        }
      });
    });
  });

  return mergeMultipleForeignKeys(relationships);

  function mergeMultipleForeignKeys(relationships: IRelationshipInfo[]) {
    const tableMap: Record<string, IRelationshipInfo> = {};
    const result: IRelationshipInfo[] = [];

    relationships.forEach((entry: IRelationshipInfo) => {
      const { table, foreignTables, foreignKeys } = entry;
      if (!(table in tableMap)) {
        tableMap[table] = { table, foreignTables: [], foreignKeys: [] };
      }
      tableMap[table].foreignTables.push(...foreignTables);
      tableMap[table].foreignKeys.push(...foreignKeys);
      result.push(entry);
    });

    Object.values(tableMap).forEach((combinedEntry: IRelationshipInfo) => {
      if (combinedEntry.foreignTables.length > 1) {
        result.push(combinedEntry);
      }
    });

    return result;
  }
}

export default identifyRelationships;
