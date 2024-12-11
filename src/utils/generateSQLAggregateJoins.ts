import { ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { changeCase, getPrimaryKey } from '@/utils/common';

function generateHasManySQLJoins(schemaInfo: ISchemaInfo[]): string[] {
  const quote = useFormStore.getState().quote;

  const joinQueries = schemaInfo
    .filter(({ hasMany }) => hasMany.length > 0) // Focus only on tables with hasMany relationships
    .flatMap(({ table, hasMany }) => {
      return hasMany.map((childTable) => {
        // Retrieve primary keys for parent table and foreign key in child table
        const parentPrimaryKey = getPrimaryKey({
          tableName: table,
          schemaInfo,
        });
        const childForeignKey = `${table}_id`; // Assume child table foreign key format

        // Construct the aggregate JOIN query for parent tables
        const joinClause = `LEFT JOIN ${quote}${childTable}${quote} ON ${quote}${table}${quote}.${parentPrimaryKey} = ${quote}${childTable}${quote}.${childForeignKey}`;
        const selectColumns = `${quote}${table}${quote}.*, COALESCE(json_agg(${quote}${childTable}${quote}.*) FILTER (WHERE ${quote}${childTable}${quote}.${childForeignKey} IS NOT NULL), '[]') AS ${changeCase(childTable).snakeCasePlural}`;
        const groupBy = `GROUP BY ${quote}${table}${quote}.${parentPrimaryKey}`;

        return `/* ${changeCase(table).sentenceCase} and its aggregated ${changeCase(childTable).plural} */\nSELECT ${selectColumns} FROM ${quote}${table}${quote} ${joinClause} ${groupBy};`;
      });
    });

  return joinQueries;
}

export default generateHasManySQLJoins;
