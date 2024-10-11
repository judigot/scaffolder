import { ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { getPrimaryKey } from '@/utils/common';

function generateSQLAggregateJoins(schemaInfo: ISchemaInfo[]): string[] {
  const quote = useFormStore.getState().quote;
  const joinQueries = generateSQLJoins(schemaInfo);

  function sortTablesByHierarchy(schemaInfo: ISchemaInfo[]): string[] {
    const tableReferenceCount: Record<string, number> = {};
    const junctionTables: string[] = [];

    schemaInfo.forEach(({ table, foreignTables }) => {
      if (foreignTables.length > 1) {
        junctionTables.push(table);
      }
      foreignTables.forEach((foreignTable) => {
        if (!tableReferenceCount[foreignTable]) {
          tableReferenceCount[foreignTable] = 0;
        }
        tableReferenceCount[foreignTable]++;
      });
    });

    const sortedTables = Object.keys(tableReferenceCount).sort(
      (a, b) => tableReferenceCount[b] - tableReferenceCount[a],
    );

    const nonJunctionTables = sortedTables.filter(
      (table) => !junctionTables.includes(table),
    );

    return [...nonJunctionTables, ...junctionTables];
  }

  function generateSQLJoins(schemaInfo: ISchemaInfo[]): string[] {
    const sortedTables = sortTablesByHierarchy(schemaInfo);
    const joinQueries: string[] = [];
    const addedJoins = new Set<string>();

    for (const relationship of schemaInfo) {
      const { table, foreignTables, foreignKeys } = relationship;
      if (foreignTables.length === 0) continue;

      // Generate single joins
      foreignTables.forEach((foreignTable, index) => {
        const foreignKey = foreignKeys[index];
        const joinQuery = generateJoinQuery(
          table,
          foreignTable,
          foreignKey,
          sortedTables,
          addedJoins,
        );
        if (joinQuery != null) joinQueries.push(joinQuery);
      });

      // Generate multiple joins
      if (foreignTables.length > 1) {
        const joinQuery = generateMultipleJoinQuery(
          table,
          foreignTables,
          foreignKeys,
          addedJoins,
        );
        if (joinQuery != null) joinQueries.push(joinQuery);
      }
    }

    return joinQueries;
  }

  function generateJoinQuery(
    table: string,
    foreignTable: string,
    foreignKey: string,
    sortedTables: string[],
    addedJoins: Set<string>,
  ): string | null {
    const key = `${table}-${foreignTable}`;
    const reverseKey = `${foreignTable}-${table}`;

    if (addedJoins.has(key) || addedJoins.has(reverseKey)) return null;

    const baseTable =
      sortedTables.indexOf(table) < sortedTables.indexOf(foreignTable)
        ? table
        : foreignTable;
    const joinTable = baseTable === table ? foreignTable : table;

    addedJoins.add(key);

    const baseTablePrimaryKey = getPrimaryKey(baseTable, schemaInfo);

    return `SELECT ${quote}${baseTable}${quote}.*, json_agg(${quote}${joinTable}${quote}.*) AS ${joinTable}_data FROM ${quote}${baseTable}${quote} LEFT JOIN ${quote}${joinTable}${quote} ON ${quote}${baseTable}${quote}.${quote}${foreignKey}${quote} = ${quote}${joinTable}${quote}.${quote}${foreignKey}${quote} GROUP BY ${quote}${baseTable}${quote}.${quote}${baseTablePrimaryKey}${quote};`;
  }

  function generateMultipleJoinQuery(
    table: string,
    foreignTables: string[],
    foreignKeys: string[],
    addedJoins: Set<string>,
  ): string | null {
    const joins: string[] = [];
    const baseTable = table;

    foreignTables.forEach((foreignTable, index) => {
      const foreignKey = foreignKeys[index];
      const key = `${table}-${foreignTable}`;
      const reverseKey = `${foreignTable}-${table}`;

      if (!addedJoins.has(key) && !addedJoins.has(reverseKey)) {
        addedJoins.add(key);
        joins.push(
          `LEFT JOIN ${quote}${foreignTable}${quote} ON ${quote}${baseTable}${quote}.${quote}${foreignKey}${quote} = ${quote}${foreignTable}${quote}.${quote}${foreignKey}${quote}`,
        );
      }
    });

    if (joins.length === 0) return null;

    const tablePrimaryKey = getPrimaryKey(table, schemaInfo);

    return `SELECT ${quote}${baseTable}${quote}.*, ${foreignTables
      .map((ft) => `json_agg(${quote}${ft}${quote}.*) AS ${ft}_data`)
      .join(', ')} FROM ${quote}${baseTable}${quote} ${joins.join(
      ' ',
    )} GROUP BY ${quote}${baseTable}${quote}.${quote}${tablePrimaryKey}${quote};`;
  }

  return joinQueries;
}

export default generateSQLAggregateJoins;
