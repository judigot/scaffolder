import identifyRelationships from '@/utils/identifyRelationships';

function generateSQLJoins(
  tableInfo: Record<string, Record<string, unknown>[]>,
) {
  const relationships = identifyRelationships(tableInfo);

  const joinQueries = relationships
    .filter(({ foreignTables }) => foreignTables.length > 0) // Filter out relationships with no foreign tables
    .map(({ table, foreignTables, foreignKeys }) => {
      const joinClauses = foreignTables
        .map((foreignTable, index) => {
          return `JOIN "${foreignTable}" ON "${table}".${foreignKeys[index]} = "${foreignTable}".${foreignKeys[index]}`;
        })
        .join(' ');

      return `SELECT * FROM "${table}" ${joinClauses};`;
    });

  const joinQueriesWithoutDuplicates = relationships.map(
    ({ table, foreignKeys, foreignTables }) => {
      const joinClauses = foreignTables
        .map((foreignTable, index) => {
          const tablesInAlphabetical = [table, foreignTable].sort((a, b) =>
            a.localeCompare(b),
          );
          if (table !== tablesInAlphabetical[0]) {
            return `SELECT * FROM "${table}" JOIN "${tablesInAlphabetical[0]}" ON "${tablesInAlphabetical[0]}".${foreignKeys[index]} = "${tablesInAlphabetical[1]}".${foreignKeys[index]};`;
          }
        })
        .join(' ');
      return joinClauses;
    },
  );

  const allowSymmetricalJoins = true;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return allowSymmetricalJoins ? joinQueries : joinQueriesWithoutDuplicates;
}

export default generateSQLJoins;
