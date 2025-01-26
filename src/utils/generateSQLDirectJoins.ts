import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';
import { changeCase, getPrimaryKey } from '@/utils/common.ts';

function generateSQLDirectJoins(schemaInfo: ISchemaInfo[]) {
  const quote = useFormStore.getState().quote;

  const joinQueries = schemaInfo
    .filter(({ childTables }) => childTables !== undefined) // Focus only on tables with childTables relationships
    .flatMap(({ tableName, childTables }) => {
      return childTables?.map((childTable) => {
        const parentPrimaryKey = getPrimaryKey({
          tableName,
          schemaInfo,
        });
        const childForeignKey = getPrimaryKey({
          tableName: childTable,
          schemaInfo,
        }); // Child foreign key references the parent's primary key

        // Construct the JOIN clause
        const joinClause = `INNER JOIN ${quote}${childTable}${quote} ON ${quote}${childTable}${quote}.${childForeignKey} = ${quote}${tableName}${quote}.${parentPrimaryKey}`;

        return `/* ${changeCase(tableName).sentenceCase} and its ${changeCase(childTable).plural} */\nSELECT ${quote}${tableName}${quote}.*, ${quote}${childTable}${quote}.* FROM ${quote}${tableName}${quote} ${joinClause};`;
      });
    });

  return joinQueries;
}

export default generateSQLDirectJoins;
