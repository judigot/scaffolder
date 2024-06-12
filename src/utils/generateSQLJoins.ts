import identifyRelationships from '@/utils/identifyRelationships';

function generateSQLJoins(tableInfo: Record<string, unknown[]>) {
  const relationships = identifyRelationships(tableInfo);

  const joinQueries = relationships.map(
    ({ table, foreignKey, foreignTable }) => {
      return `SELECT * FROM "${table}" JOIN "${foreignTable}" ON "${table}".${foreignKey} = "${foreignTable}".${foreignKey};`;
    },
  );

  return joinQueries;
}

export default generateSQLJoins;
