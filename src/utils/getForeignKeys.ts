function getForeignKeys(tableInfo: Record<string, Record<string, unknown>[]>) {
  /* Step 1: Extract foreign keys */
  function extractForeignKeys(
    tableInfo: Record<string, Record<string, unknown>[]>,
  ) {
    const foreignKeys: {
      table: string;
      foreignKey: string;
      foreignTable: string;
    }[] = [];

    Object.keys(tableInfo).forEach((tableName) => {
      const primaryKey = Object.keys(tableInfo[tableName][0])[0];
      Object.entries(tableInfo).forEach(([otherTableName, otherTableValue]) => {
        if (otherTableName !== tableName) {
          const otherTableColumnNames: string[] = Object.keys(
            otherTableValue[0],
          );
          if (otherTableColumnNames.includes(primaryKey)) {
            foreignKeys.push({
              table: otherTableName,
              foreignKey: primaryKey,
              foreignTable: tableName,
            });
          }
        }
      });
    });

    return foreignKeys;
  }

  /* Extracted foreign keys array from tableInfo */
  const extractedForeignKeys = extractForeignKeys(tableInfo);

  /* Step 2: Transform relations */
  const groupForeignKeys = (
    foreignKeys: { table: string; foreignKey: string; foreignTable: string }[],
  ) => {
    const tableNames: string[] = Array.from(
      new Set(foreignKeys.map((item) => item.table)),
    );
    const transformed = tableNames.map((tableName) => {
      const relatedForeignKeys = foreignKeys
        .filter((item) => item.table === tableName)
        .map(({ foreignKey, foreignTable }) => ({ foreignKey, foreignTable }));
      return { table: tableName, foreignKeys: relatedForeignKeys };
    });
    return transformed;
  };

  /* Transform the extracted foreign keys into the consolidated format */
  return {x: "atay"};
  return groupForeignKeys(extractedForeignKeys);
}

// /* prettier-ignore */ function getForeignKeys( tableInfo: Record<string, Record<string, unknown>[]> ) { /* Step 1: Extract foreign keys */ function extractForeignKeys( tableInfo: Record<string, Record<string, unknown>[]> ) { const foreignKeys: { table: string; foreignKey: string; foreignTable: string; }[] = []; Object.keys(tableInfo).forEach((tableName) => { const { [tableName]: _, ...otherTables } = tableInfo; const primaryKey = Object.keys(tableInfo[tableName][0])[0]; Object.entries(otherTables).forEach( ([otherTableName, otherTableValue]) => { const otherTableColumnNames: string[] = Object.keys( otherTableValue[0] ); if (otherTableColumnNames.includes(primaryKey)) { foreignKeys.push({ table: otherTableName, foreignKey: primaryKey, foreignTable: tableName, }); } } ); }); return foreignKeys; } /* Extracted foreign keys array from tableInfo */ const extractedForeignKeys = extractForeignKeys(tableInfo); /* Step 2: Transform relations */ const groupForeignKeys = ( foreignKeys: { table: string; foreignKey: string; foreignTable: string }[] ) => { const tableNames: string[] = Array.from( new Set(foreignKeys.map((item) => item.table)) ); const transformed = tableNames.map((tableName) => { const relatedForeignKeys = foreignKeys .filter((item) => item.table === tableName) .map(({ foreignKey, foreignTable }) => ({ foreignKey, foreignTable, })); return { table: tableName, foreignKeys: relatedForeignKeys, }; }); return transformed; }; /* Transform the extracted foreign keys into the consolidated format */ return groupForeignKeys(extractedForeignKeys); }

export default getForeignKeys;
