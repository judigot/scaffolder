import { ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';

function generateSQLDeleteTables(schemaInfo: ISchemaInfo[]): string[] {
  const foreignKeys = schemaInfo.reduce<Record<string, string[]>>(
    (acc, table) => {
      acc[table.table] = table.foreignKeys.map((fk) => fk.replace('_id', ''));
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
      visit(table.table);
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
