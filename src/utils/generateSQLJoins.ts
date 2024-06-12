import identifyRelationships from '@/utils/identifyRelationships';

function generateSQLJoins(tableInfo: Record<string, unknown[]>) {
  const relationships = identifyRelationships(tableInfo);

  const joinQueries = relationships.map((join) => {
    return `SELECT * FROM "${join.foreignTable}" JOIN "${join.table}" ON "${join.foreignTable}".${join.foreignKey} = "${join.table}".${join.foreignKey};`;
  });

  return joinQueries;
}

export default generateSQLJoins;
