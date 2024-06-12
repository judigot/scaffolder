interface ITableRelationship {
  table: string;
  foreignTables: string[];
  foreignKeys: string[];
}

function identifyRelationships(
  data: Record<string, Record<string, unknown>[]>,
): ITableRelationship[] {
  const relationships: ITableRelationship[] = [];

  for (const table in data) {
    const foreignTables: string[] = [];
    const foreignKeys: string[] = [];

    data[table].forEach((row) => {
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
    });
  }

  return relationships;
}

function sortTablesByHierarchy(relationships: ITableRelationship[]): string[] {
  const tableReferenceCount: Record<string, number> = {};
  const junctionTables: string[] = [];

  relationships.forEach(({ table, foreignTables }) => {
    if (foreignTables.length > 1) {
      junctionTables.push(table);
    }
    foreignTables.forEach((foreignTable) => {
      if (!tableReferenceCount[foreignTable]) {
        tableReferenceCount[foreignTable] = 0;
      }
      tableReferenceCount[foreignTable]++;
    });
  });

  const sortedTables = Object.keys(tableReferenceCount).sort(
    (a, b) => tableReferenceCount[b] - tableReferenceCount[a],
  );

  const nonJunctionTables = sortedTables.filter(
    (table) => !junctionTables.includes(table),
  );

  return [...nonJunctionTables, ...junctionTables];
}

function generateSQLJoins(relationships: ITableRelationship[]): string[] {
  const sortedTables = sortTablesByHierarchy(relationships);
  const joinQueries: string[] = [];
  const addedJoins = new Set<string>();

  for (const relationship of relationships) {
    const { table, foreignTables, foreignKeys } = relationship;
    if (foreignTables.length === 0) continue;

    // Generate single joins
    foreignTables.forEach((foreignTable, index) => {
      const foreignKey = foreignKeys[index];
      const joinQuery = generateJoinQuery(
        table,
        foreignTable,
        foreignKey,
        sortedTables,
        addedJoins,
      );
      if (joinQuery != null) joinQueries.push(joinQuery);
    });

    // Generate multiple joins
    if (foreignTables.length > 1) {
      const joinQuery = generateMultipleJoinQuery(
        table,
        foreignTables,
        foreignKeys,
        addedJoins,
      );
      if (joinQuery != null) joinQueries.push(joinQuery);
    }
  }

  return joinQueries;
}

function generateJoinQuery(
  table: string,
  foreignTable: string,
  foreignKey: string,
  sortedTables: string[],
  addedJoins: Set<string>,
): string | null {
  const key = `${table}-${foreignTable}`;
  const reverseKey = `${foreignTable}-${table}`;

  if (addedJoins.has(key) || addedJoins.has(reverseKey)) return null;

  const baseTable =
    sortedTables.indexOf(table) < sortedTables.indexOf(foreignTable)
      ? table
      : foreignTable;
  const joinTable = baseTable === table ? foreignTable : table;

  addedJoins.add(key);

  return `SELECT "${baseTable}".*, json_agg("${joinTable}".*) AS ${joinTable}_data FROM "${baseTable}" LEFT JOIN "${joinTable}" ON "${baseTable}"."${foreignKey}" = "${joinTable}"."${foreignKey}" GROUP BY "${baseTable}"."${baseTable}_id";`;
}

function generateMultipleJoinQuery(
  table: string,
  foreignTables: string[],
  foreignKeys: string[],
  addedJoins: Set<string>,
): string | null {
  const joins: string[] = [];
  const baseTable = table;

  foreignTables.forEach((foreignTable, index) => {
    const foreignKey = foreignKeys[index];
    const key = `${table}-${foreignTable}`;
    const reverseKey = `${foreignTable}-${table}`;

    if (!addedJoins.has(key) && !addedJoins.has(reverseKey)) {
      addedJoins.add(key);
      joins.push(
        `LEFT JOIN "${foreignTable}" ON "${baseTable}"."${foreignKey}" = "${foreignTable}"."${foreignKey}"`,
      );
    }
  });

  if (joins.length === 0) return null;

  return `SELECT "${baseTable}".*, ${foreignTables
    .map((ft) => `json_agg("${ft}".*) AS ${ft}_data`)
    .join(', ')} FROM "${baseTable}" ${joins.join(
    ' ',
  )} GROUP BY "${baseTable}"."${table}_id";`;
}

function getGeneratedSQLJoins(
  tableInfo: Record<string, Record<string, unknown>[]>,
): string[] {
  const relationships = identifyRelationships(tableInfo);
  const joinQueries = generateSQLJoins(relationships);
  return joinQueries;
}

export default getGeneratedSQLJoins;
