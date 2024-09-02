import { ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';

function generateSQLJoins(schemaInfo: ISchemaInfo[]): string[] {
  const quote = useFormStore.getState().quote;

  const allowSymmetricalJoins = true;

  const joinQueries = schemaInfo
    .filter(({ foreignTables }) => foreignTables.length > 0)
    .flatMap(({ table, foreignTables, foreignKeys }) => {
      const joinClauses = foreignTables.map((foreignTable, index) => {
        const joinClause = `JOIN ${quote}${foreignTable}${quote} ON ${quote}${table}${quote}.${foreignKeys[index]} = ${quote}${foreignTable}${quote}.${foreignKeys[index]}`;
        const symmetricalJoinClause = `JOIN ${quote}${table}${quote} ON ${quote}${foreignTable}${quote}.${foreignKeys[index]} = ${quote}${table}${quote}.${foreignKeys[index]}`;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return allowSymmetricalJoins
          ? [
              `SELECT * FROM ${quote}${table}${quote} ${joinClause};`,
              `SELECT * FROM ${quote}${foreignTable}${quote} ${symmetricalJoinClause};`,
            ]
          : [`SELECT * FROM ${quote}${table}${quote} ${joinClause};`];
      });

      return joinClauses.flat();
    });

  return joinQueries;
}

export default generateSQLJoins;
