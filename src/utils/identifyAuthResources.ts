import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

const USER_TABLE_PATTERNS = ['user', 'users', 'account', 'accounts'];
const OWNER_FIELD_PATTERNS = ['user_id', 'account_id', 'owner_id'];

/**
 * Find the user table in the schema based on common naming patterns.
 */
export const findUserTable = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo | undefined => {
  return schemaInfo.find((t) =>
    USER_TABLE_PATTERNS.includes(t.tableName.toLowerCase()),
  );
};

/**
 * Identify auth resources by traversing the childTables hierarchy from the user table.
 * Tables that are descendants (children, grandchildren, etc.) of the user table
 * are marked as auth resources.
 */
export const identifyAuthResources = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] => {
  const userTable = findUserTable(schemaInfo);
  if (!userTable) {return schemaInfo;}

  const userTableName = userTable.tableName;
  const authTables = new Set<string>();

  // BFS using existing childTables (same pattern as topologicalSort)
  const queue = [...(userTable.childTables ?? [])];
  while (queue.length > 0) {
    const tableName = queue.shift();
    if (tableName === undefined) {continue;}
    if (authTables.has(tableName)) {continue;}

    const table = schemaInfo.find((t) => t.tableName === tableName);
    if (!table || table.isPivot) {continue;}

    authTables.add(tableName);
    queue.push(...(table.childTables ?? []));
  }

  // Mark tables and find ownerField
  return schemaInfo.map((table) => {
    if (!authTables.has(table.tableName)) {return table;}

    // Find ownerField: first check for direct FK to user table, then fall back to common patterns
    const ownerField =
      table.columnsInfo.find(
        (col) => col.foreign_key?.foreign_table_name === userTableName,
      )?.column_name ??
      table.columnsInfo.find((col) =>
        OWNER_FIELD_PATTERNS.includes(col.column_name),
      )?.column_name;

    return {
      ...table,
      isAuthResource: true as const,
      ...(ownerField !== undefined && ownerField !== '' && { ownerField }),
    };
  });
};
