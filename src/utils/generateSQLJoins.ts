import identifyRelationships from '@/utils/identifyRelationships';

function generateSQLJoins(tableInfo: Record<string, string | string[]>) {
  const relationships = identifyRelationships(tableInfo);

  const joinQueries = relationships.map(
    ({ table, foreignKeys, foreignTables }) => {
      const joinClauses = foreignTables
        .map((foreignTable, index) => {
          return `JOIN "${foreignTable}" ON "${table}".${foreignKeys[index]} = "${foreignTable}".${foreignKeys[index]}`;
        })
        .join(' ');
      return `SELECT * FROM "${table}" ${joinClauses};`;
    },
  );

  return joinQueries;
}

export default generateSQLJoins;
