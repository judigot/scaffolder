export interface IRelationshipInfo {
  table: string;
  foreignTables: string[];
  foreignKeys: string[];
  childTables: string[];
}

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
