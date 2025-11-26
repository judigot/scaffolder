import { useFormStore } from '../useFormStore';
import { changeCase, getPrimaryKey } from '../utils/common';
function generateHasManySQLJoins(schemaInfo) {
  const quote = useFormStore.getState().quote;
  const joinQueries = schemaInfo
    .filter(({ hasMany }) => hasMany !== undefined) // Focus only on tables with hasMany relationships
    .flatMap(({ tableName, hasMany }) => {
      return hasMany?.map((childTable) => {
        // Retrieve primary keys for parent table and foreign key in child table
        const parentPrimaryKey = getPrimaryKey({
          tableName,
          schemaInfo,
        });
        const childForeignKey = schemaInfo
          .find(({ tableName }) => tableName === childTable)
          ?.columnsInfo.find(
            (col) => col.foreign_key?.foreign_table_name === tableName,
          )?.column_name;
        if (childForeignKey == null) {
          throw new Error(
            `Foreign key not found for table ${childTable} referencing ${tableName}`,
          );
        }
        // Construct the aggregate JOIN query for parent tables
        const joinClause = `LEFT JOIN ${quote}${childTable}${quote} ON ${quote}${tableName}${quote}.${parentPrimaryKey} = ${quote}${childTable}${quote}.${childForeignKey}`;
        const selectColumns = `${quote}${tableName}${quote}.*, COALESCE(json_agg(${quote}${childTable}${quote}.*) FILTER (WHERE ${quote}${childTable}${quote}.${childForeignKey} IS NOT NULL), '[]') AS ${changeCase(childTable).snakeCasePlural}`;
        const groupBy = `GROUP BY ${quote}${tableName}${quote}.${parentPrimaryKey}`;
        return `/* ${changeCase(tableName).sentenceCase} and its aggregated ${changeCase(childTable).plural} */\nSELECT ${selectColumns} FROM ${quote}${tableName}${quote} ${joinClause} ${groupBy};`;
      });
    });
  return joinQueries;
}
export default generateHasManySQLJoins;
