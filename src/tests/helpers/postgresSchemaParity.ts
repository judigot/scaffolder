/** Semantic PostgreSQL catalog normalisation used by golden migration tests. */
export type CatalogRow = Record<string, unknown>;

export interface NormalizedPostgresSchema {
  tables: Record<string, {
    columns: Record<string, { type: string; nullable: boolean; default: string | null }>;
    primaryKey: string[];
    foreignKeys: { columns: string[]; table: string; referencedColumns: string[] }[];
    uniqueConstraints: string[][];
    indexes: { columns: string[]; unique: boolean }[];
  }>;
}

const text = (value: unknown): string => String(value ?? '').trim();
const bool = (value: unknown): boolean => value === true || value === 't' || value === 'true';
const list = (value: unknown): string[] => Array.isArray(value) ? value.map(text) : text(value).split(',').map((v) => v.trim()).filter(Boolean);

/**
 * Convert rows from pg_catalog information-schema queries into a deterministic,
 * constraint-name-independent representation. Catalog query aliases are kept
 * deliberately permissive so this can be used with pg and postgres.js results.
 */
export function normalizePostgresCatalog(rows: {
  tables?: CatalogRow[];
  columns?: CatalogRow[];
  primaryKeys?: CatalogRow[];
  foreignKeys?: CatalogRow[];
  uniqueConstraints?: CatalogRow[];
  indexes?: CatalogRow[];
}): NormalizedPostgresSchema {
  const result: NormalizedPostgresSchema = { tables: {} };
  for (const row of rows.tables ?? []) {
    const name = text(row.table_name ?? row.tableName);
    if (name) result.tables[name] = { columns: {}, primaryKey: [], foreignKeys: [], uniqueConstraints: [], indexes: [] };
  }
  const table = (row: CatalogRow) => {
    const name = text(row.table_name ?? row.tableName);
    if (!result.tables[name]) result.tables[name] = { columns: {}, primaryKey: [], foreignKeys: [], uniqueConstraints: [], indexes: [] };
    return result.tables[name];
  };
  for (const row of rows.columns ?? []) {
    const t = table(row); const name = text(row.column_name ?? row.columnName);
    if (name) t.columns[name] = { type: text(row.data_type ?? row.udt_name ?? row.type).toLowerCase(), nullable: bool(row.is_nullable === 'YES' || row.is_nullable === true), default: row.column_default == null ? null : text(row.column_default).replace(/::[a-z_ ]+/gi, '').trim() };
  }
  for (const row of rows.primaryKeys ?? []) table(row).primaryKey.push(...list(row.columns ?? row.column_names ?? row.column_name));
  for (const row of rows.foreignKeys ?? []) table(row).foreignKeys.push({ columns: list(row.columns ?? row.column_names ?? row.column_name).sort(), table: text(row.foreign_table_name ?? row.referenced_table), referencedColumns: list(row.foreign_columns ?? row.referenced_columns ?? row.foreign_column_name).sort() });
  for (const row of rows.uniqueConstraints ?? []) table(row).uniqueConstraints.push(list(row.columns ?? row.column_names ?? row.column_name).sort());
  for (const row of rows.indexes ?? []) table(row).indexes.push({ columns: list(row.columns ?? row.column_names ?? row.column_name).sort(), unique: bool(row.is_unique ?? row.unique) });
  for (const t of Object.values(result.tables)) {
    t.primaryKey = [...new Set(t.primaryKey)].sort();
    t.foreignKeys.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    t.uniqueConstraints = t.uniqueConstraints.map((v) => [...new Set(v)].sort()).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    t.indexes.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return result;
}

export function schemaParityDifferences(expected: NormalizedPostgresSchema, actual: NormalizedPostgresSchema): string[] {
  const differences: string[] = [];
  const names = new Set([...Object.keys(expected.tables), ...Object.keys(actual.tables)]);
  for (const name of [...names].sort()) {
    if (!expected.tables[name]) { differences.push(`table '${name}' is unexpected`); continue; }
    if (!actual.tables[name]) { differences.push(`table '${name}' is missing`); continue; }
    const a = expected.tables[name]; const b = actual.tables[name];
    if (JSON.stringify(a.columns) !== JSON.stringify(b.columns)) differences.push(`table '${name}' columns differ`);
    if (JSON.stringify(a.primaryKey) !== JSON.stringify(b.primaryKey)) differences.push(`table '${name}' primary key differs`);
    if (JSON.stringify(a.foreignKeys) !== JSON.stringify(b.foreignKeys)) differences.push(`table '${name}' foreign keys differ`);
    if (JSON.stringify(a.uniqueConstraints) !== JSON.stringify(b.uniqueConstraints)) differences.push(`table '${name}' unique constraints differ`);
    if (JSON.stringify(a.indexes) !== JSON.stringify(b.indexes)) differences.push(`table '${name}' indexes differ`);
  }
  return differences;
}
