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

  tableNames.forEach((foreignTables) => {
    const sourceColumns = Object.keys(tableInfo[foreignTables][0]);

    sourceColumns.forEach((column) => {
      if (column.endsWith('_id')) {
        const foreignKeys = column;
        tableNames.forEach((table) => {
          const tableRecord = tableInfo[table][0];
          const isDifferentTable = table !== foreignTables;
          const hasForeignKey = Object.prototype.hasOwnProperty.call(
            tableRecord,
            foreignKeys,
          );

          if (isDifferentTable && hasForeignKey) {
            relationships.push({
              table,
              foreignTables: [foreignTables],
              foreignKeys: [foreignKeys],
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
