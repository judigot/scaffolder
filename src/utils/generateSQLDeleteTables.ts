function generateSQLDeleteTables(
  tableInfo: Record<string, Record<string, unknown>[]>,
): string[] {
  const tables = Object.keys(tableInfo);
  return tables.map((table) => `DROP TABLE IF EXISTS "${table}" CASCADE;`);
}

export default generateSQLDeleteTables;
