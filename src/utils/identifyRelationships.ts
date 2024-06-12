interface IRelationshipInfo {
  table: string;
  foreignTable: string[];
  foreignKey: string[];
}
function identifyRelationships(tableInfo: Record<string, string | string[]>): {
  table: string;
  foreignTable: string[];
  foreignKey: string[];
}[] {
  const relationships: IRelationshipInfo[] = [];
  const tableNames = Object.keys(tableInfo);

  tableNames.forEach((foreignTable) => {
    const sourceColumns = Object.keys(tableInfo[foreignTable][0]);

    sourceColumns.forEach((column) => {
      if (column.endsWith('_id')) {
        const foreignKey = column;
        tableNames.forEach((table) => {
          const tableRecord = tableInfo[table][0];
          const isDifferentTable = table !== foreignTable;
          const hasForeignKey = Object.prototype.hasOwnProperty.call(
            tableRecord,
            foreignKey,
          );

          if (isDifferentTable && hasForeignKey) {
            relationships.push({
              table,
              foreignTable: [foreignTable],
              foreignKey: [foreignKey],
            });
          }
        });
      }
    });
  });

  return combineDuplicates(relationships);

  function combineDuplicates(array: IRelationshipInfo[]) {
    const tableMap: Record<string, IRelationshipInfo> = {};
    const result: IRelationshipInfo[] = [];

    array.forEach((entry: IRelationshipInfo) => {
      const { table, foreignTable, foreignKey } = entry;
      if (!(table in tableMap)) {
        tableMap[table] = { table, foreignTable: [], foreignKey: [] };
      }
      tableMap[table].foreignTable.push(...foreignTable);
      tableMap[table].foreignKey.push(...foreignKey);
      result.push(entry);
    });

    Object.values(tableMap).forEach((combinedEntry: IRelationshipInfo) => {
      if (combinedEntry.foreignTable.length > 1) {
        result.push(combinedEntry);
      }
    });

    return result;
  }
}

export default identifyRelationships;
