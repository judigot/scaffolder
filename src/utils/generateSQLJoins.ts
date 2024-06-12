import identifyRelationships from '@/utils/identifyRelationships';

function generateSQLJoins(tableInfo: Record<string, string | string[]>) {
  const relationships = identifyRelationships(tableInfo);

  const joinQueries = relationships.map(
    ({ table, foreignKey, foreignTable }) => {
      const joinClauses = foreignTable
        .map((ft, index) => {
          return `JOIN "${ft}" ON "${table}".${foreignKey[index]} = "${ft}".${foreignKey[index]}`;
        })
        .join(' ');
      return `SELECT * FROM "${table}" ${joinClauses};`;
    },
  );

  return joinQueries;
}

export default generateSQLJoins;
