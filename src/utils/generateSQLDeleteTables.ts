import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';

function generateSQLDeleteTables(schemaInfo: ISchemaInfo[]) {
  const foreignKeys = schemaInfo.reduce<Record<string, string[]>>(
    (acc, table) => {
      if (table.foreignKeys) {
        acc[table.tableName] = table.foreignKeys
          .map((fk) => fk.replace('_id', ''))
          .filter((fk): fk is string => fk !== '');
      }
      return acc;
    },
    {},
  );

  const getDeletionOrder = (
    foreignKeys: Record<string, string[]>,
  ): string[] => {
    const visited = new Set<string>();
    const order: string[] = [];
    const visit = (table: string) => {
      if (!visited.has(table)) {
        visited.add(table);
        (foreignKeys[table] ?? []).forEach(visit);
        order.push(table);
      }
    };
    schemaInfo.forEach((table) => {
      visit(table.tableName);
    });
    return order.reverse();
  };

  const deletionOrder = getDeletionOrder(foreignKeys);
  const quote = useFormStore.getState().quote;

  return deletionOrder.map(
    (table) =>
      // `DROP TABLE IF EXISTS ${quote}${table}${quote}${dbType === 'postgresql' ? ' CASCADE' : ''};`,
      `DROP TABLE IF EXISTS ${quote}${table}${quote};`,
  );
}

export default generateSQLDeleteTables;
