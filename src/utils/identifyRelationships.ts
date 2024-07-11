export interface IRelationshipInfo {
  table: string;
  foreignTables: string[];
  foreignKeys: string[];
  childTables: string[];
}

// function identifyRelationships(
//   tableInfo: Record<string, Record<string, unknown>[]>,
// ): {
//   table: string;
//   foreignTables: string[];
//   foreignKeys: string[];
// }[] {
//   const relationships: IRelationshipInfo[] = [];
//   const tableNames = Object.keys(tableInfo);

//   tableNames.forEach((foreignTable) => {
//     const foreignKeyColumns = Object.keys(tableInfo[foreignTable][0]).filter(
//       (column) => column.endsWith('_id'),
//     );

//     const otherTables = tableNames.filter((table) => table !== foreignTable);

//     otherTables.forEach((table) => {
//       const tableColumns = tableInfo[table][0];

//       foreignKeyColumns.forEach((foreignKey) => {
//         const hasForeignKey = Object.prototype.hasOwnProperty.call(
//           tableColumns,
//           foreignKey,
//         );

//         if (hasForeignKey) {
//           relationships.push({
//             table,
//             foreignTables: [foreignTable],
//             foreignKeys: [foreignKey],
//           });
//         }
//       });
//     });
//   });

//   return mergeMultipleForeignKeys(relationships);

//   function mergeMultipleForeignKeys(relationships: IRelationshipInfo[]) {
//     const tableMap: Record<string, IRelationshipInfo> = {};
//     const result: IRelationshipInfo[] = [];

//     relationships.forEach((entry: IRelationshipInfo) => {
//       const { table, foreignTables, foreignKeys } = entry;
//       if (!(table in tableMap)) {
//         tableMap[table] = { table, foreignTables: [], foreignKeys: [] };
//       }
//       tableMap[table].foreignTables.push(...foreignTables);
//       tableMap[table].foreignKeys.push(...foreignKeys);
//       result.push(entry);
//     });

//     Object.values(tableMap).forEach((combinedEntry: IRelationshipInfo) => {
//       if (combinedEntry.foreignTables.length > 1) {
//         result.push(combinedEntry);
//       }
//     });

//     return result;
//   }
// }

function identifyRelationships(
  data: Record<string, Record<string, unknown>[]>,
): IRelationshipInfo[] {
  const relationships: IRelationshipInfo[] = [];

  // First pass to identify foreign tables and foreign keys
  for (const table in data) {
    if (Object.prototype.hasOwnProperty.call(data, table)) {
      const foreignTables: string[] = [];
      const foreignKeys: string[] = [];

      const rows = data[table];
      rows.forEach((row) => {
        for (const key in row) {
          if (
            typeof key === 'string' &&
            key.endsWith('_id') &&
            key !== `${table}_id`
          ) {
            const foreignTable = key.replace('_id', '');
            foreignTables.push(foreignTable);
            foreignKeys.push(key);
          }
        }
      });

      relationships.push({
        table,
        foreignTables: Array.from(new Set(foreignTables)),
        foreignKeys: Array.from(new Set(foreignKeys)),
        childTables: [], // Initialize childTables as an empty array
      });
    }
  }

  // Second pass to identify child tables
  relationships.forEach((relationship) => {
    relationship.foreignTables.forEach((foreignTable) => {
      const foreignRelationship = relationships.find(
        (r) => r.table === foreignTable,
      );
      if (foreignRelationship) {
        foreignRelationship.childTables.push(relationship.table);
      }
    });
  });

  // Remove duplicates from childTables
  relationships.forEach((relationship) => {
    relationship.childTables = Array.from(new Set(relationship.childTables));
  });

  return relationships;
}
export default identifyRelationships;
