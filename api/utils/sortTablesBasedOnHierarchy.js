import { isSchemaInfoAlreadySorted } from '../utils/isSchemaInfoAlreadySorted';
/*
  Sort tables topologically, so that parent tables appear before child tables.
*/
export const sortTablesBasedOnHierarchy = (schemaInfo) => {
  if (isSchemaInfoAlreadySorted(schemaInfo)) {
    return schemaInfo; /* Return original if already sorted */
  }
  const sorted = [];
  const visited = new Set();
  const visit = (table) => {
    if (visited.has(table.tableName)) {
      return;
    }
    visited.add(table.tableName);
    if (table.childTables != null) {
      table.childTables.forEach((childTable) => {
        const childRelationship = schemaInfo.find(
          (r) => r.tableName === childTable,
        );
        if (childRelationship) {
          visit(childRelationship);
        }
      });
    }
    sorted.push(table);
  };
  schemaInfo.forEach((table) => {
    visit(table);
  });
  return sorted.reverse();
};
