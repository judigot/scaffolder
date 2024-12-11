import { ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { changeCase, getPrimaryKey } from '@/utils/common';

function generateSQLDirectJoins(schemaInfo: ISchemaInfo[]): string[] {
  const quote = useFormStore.getState().quote;

  const joinQueries = schemaInfo
    .filter(({ childTables }) => childTables.length > 0) // Focus only on tables with childTables relationships
    .flatMap(({ table, childTables }) => {
      return childTables.map((childTable) => {
        const parentPrimaryKey = getPrimaryKey({
          tableName: table,
          schemaInfo,
        });
        const childForeignKey = getPrimaryKey({
          tableName: childTable,
          schemaInfo,
        }); // Child foreign key references the parent's primary key

        // Construct the JOIN clause
        const joinClause = `INNER JOIN ${quote}${childTable}${quote} ON ${quote}${childTable}${quote}.${childForeignKey} = ${quote}${table}${quote}.${parentPrimaryKey}`;

        return `/* ${changeCase(table).sentenceCase} and its ${changeCase(childTable).plural} */\nSELECT ${quote}${table}${quote}.*, ${quote}${childTable}${quote}.* FROM ${quote}${table}${quote} ${joinClause};`;
      });
    });

  return joinQueries;
}

export default generateSQLDirectJoins;
