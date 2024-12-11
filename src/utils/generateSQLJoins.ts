import { ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { changeCase, getPrimaryKey } from '@/utils/common';

function generateHasOneSQLJoins(schemaInfo: ISchemaInfo[]): string[] {
  const quote = useFormStore.getState().quote;

  const joinQueries = schemaInfo
    .filter(({ hasOne }) => hasOne.length > 0) // Focus only on tables with hasOne relationships
    .flatMap(({ table, hasOne }) => {
      return hasOne.map((childTable) => {
        // Retrieve primary keys for both parent and child tables
        const parentPrimaryKey = getPrimaryKey({
          tableName: table,
          schemaInfo,
        });
        const childPrimaryKey = getPrimaryKey({
          tableName: childTable,
          schemaInfo,
        });

        // Construct the JOIN clause
        const joinClause = `LEFT JOIN ${quote}${childTable}${quote} ON ${quote}${table}${quote}.${parentPrimaryKey} = ${quote}${childTable}${quote}.${childPrimaryKey}`;

        return `/* ${changeCase(table).sentenceCase} and its ${changeCase(childTable).singular} */\nSELECT * FROM ${quote}${table}${quote} ${joinClause};`;
      });
    });

  return joinQueries;
}

export default generateHasOneSQLJoins;
