import { IRelationshipInfo } from '@/utils/identifyRelationships';

function generateSQLJoins(relationships: IRelationshipInfo[]): string[] {
  const allowSymmetricalJoins = true;

  const joinQueries = relationships
    .filter(({ foreignTables }) => foreignTables.length > 0)
    .flatMap(({ table, foreignTables, foreignKeys }) => {
      const joinClauses = foreignTables.map((foreignTable, index) => {
        const joinClause = `JOIN "${foreignTable}" ON "${table}".${foreignKeys[index]} = "${foreignTable}".${foreignKeys[index]}`;
        const symmetricalJoinClause = `JOIN "${table}" ON "${foreignTable}".${foreignKeys[index]} = "${table}".${foreignKeys[index]}`;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return allowSymmetricalJoins
          ? [
              `SELECT * FROM "${table}" ${joinClause};`,
              `SELECT * FROM "${foreignTable}" ${symmetricalJoinClause};`,
            ]
          : [`SELECT * FROM "${table}" ${joinClause};`];
      });

      return joinClauses.flat();
    });

  // const joinQueriesWithoutDuplicates = relationships.map(
  //   ({ table, foreignKeys, foreignTables }) => {
  //     const joinClauses = foreignTables
  //       .map((foreignTable, index) => {
  //         const tablesInAlphabetical = [table, foreignTable].sort((a, b) =>
  //           a.localeCompare(b),
  //         );
  //         if (table !== tablesInAlphabetical[0]) {
  //           return `SELECT * FROM "${table}" JOIN "${tablesInAlphabetical[0]}" ON "${tablesInAlphabetical[0]}".${foreignKeys[index]} = "${tablesInAlphabetical[1]}".${foreignKeys[index]};`;
  //         }
  //       })
  //       .join(' ');
  //     return joinClauses;
  //   },
  // );

  return joinQueries;
}

export default generateSQLJoins;
