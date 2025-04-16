import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';

function generateSQLDeleteTables(schemaInfo: ISchemaInfo[]) {
  const quote = useFormStore.getState().quote;

  return schemaInfo
    .map((table) => `DROP TABLE IF EXISTS ${quote}${table.tableName}${quote};`)
    .reverse();
}

export default generateSQLDeleteTables;
