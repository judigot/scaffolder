/*
  Check whether schemaInfo is already sorted:
  Each table's childTables (if any) should appear only after the current table.
*/
export const isSchemaInfoAlreadySorted = (schemaInfo) => {
  return schemaInfo.every(
    (relationship, i) =>
      relationship.childTables == null ||
      relationship.childTables.every(
        (childTable) =>
          schemaInfo.findIndex((r) => r.tableName === childTable) > i,
      ),
  );
};
