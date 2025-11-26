import { useFormStore } from '../useFormStore';
function generateSQLDeleteTables(schemaInfo) {
  const quote = useFormStore.getState().quote;
  return schemaInfo
    .map((table) => `DROP TABLE IF EXISTS ${quote}${table.tableName}${quote};`)
    .reverse();
}
export default generateSQLDeleteTables;
