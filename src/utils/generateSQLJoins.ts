import { ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { changeCase, getPrimaryKey } from '@/utils/common';

function generateSQLJoins(schemaInfo: ISchemaInfo[]): string[] {
  const quote = useFormStore.getState().quote;

  const allowSymmetricalJoins = false;

  const joinQueries = schemaInfo
    .filter(({ foreignTables }) => foreignTables.length > 0)
    .flatMap(({ table, foreignTables, foreignKeys }) => {
      const joinClauses = foreignTables.map((foreignTable, index) => {
        const primaryKey = getPrimaryKey({
          tableName: table,
          schemaInfo,
        });
        const foreignTablePrimaryKey = getPrimaryKey({
          tableName: foreignTable,
          schemaInfo,
        });
        const foreignKey = foreignKeys[index];
        const joinClause = `JOIN ${quote}${foreignTable}${quote} ON ${quote}${table}${quote}.${primaryKey} = ${quote}${foreignTable}${quote}.${foreignTablePrimaryKey}`;
        const symmetricalJoinClause = `JOIN ${quote}${table}${quote} ON ${quote}${foreignTable}${quote}.${foreignTablePrimaryKey} = ${quote}${table}${quote}.${foreignKey}`;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return allowSymmetricalJoins
          ? [
              `SELECT * FROM ${quote}${table}${quote} ${joinClause};`,
              `SELECT * FROM ${quote}${foreignTable}${quote} ${symmetricalJoinClause};`,
            ]
          : [
              `/* ${changeCase(foreignTable).sentenceCasePlural} and their ${changeCase(table).singular} */\nSELECT * FROM ${quote}${table}${quote} ${joinClause};`,
            ];
      });

      return joinClauses.flat();
    });

  return joinQueries;
}

export default generateSQLJoins;
