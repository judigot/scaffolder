import fs from 'node:fs';
import path from 'node:path';
import { extractDBConnectionInfo } from '../utils/extractDBConnectionInfo';
import { executeMySQL } from '../utils/executeMySQL';
import { executePostgreSQL } from '../utils/executePostgreSQL';
import process from 'node:process';
import { IGNORED_TABLES_LARAVEL } from '../constants';
const platform = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}
const readSqlFile = (filename) => {
  return fs.readFileSync(path.join(__dirname, `../${filename}`), 'utf8');
};
export const introspect = async (dbConnection, dbType) => {
  if (!dbConnection) {
    throw new Error('Database connection string is required');
  }
  const { dbName } = extractDBConnectionInfo(dbConnection);
  const query = readSqlFile(`introspect_${dbType}.sql`);
  let result;
  if (dbType === 'postgresql') {
    result = await executePostgreSQL(dbConnection, query);
  }
  if (dbType === 'mysql') {
    const mysqlIntrospectionQuery = query.replace(/\$DB_NAME/g, dbName);
    result = await executeMySQL(dbConnection, mysqlIntrospectionQuery);
  }
  if (result === null || result === undefined) {
    throw new Error(`Unsupported database type`);
  }
  // Filter out tables that are in the ignoredTables_laravel array
  const filteredResult = (Array.isArray(result) ? result : []).filter(
    (table) => {
      return !IGNORED_TABLES_LARAVEL.includes(table.table_name);
    },
  );
  return filteredResult;
};
export default introspect;
