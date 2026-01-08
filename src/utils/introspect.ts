import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDBConnectionInfo } from '@/utils/extractDBConnectionInfo.ts';
import { executeMySQL } from '@/utils/executeMySQL.ts';
import { executePostgreSQL } from '@/utils/executePostgreSQL.ts';
import type { DBTypes } from '@/interfaces/interfaces.ts';
import { IGNORED_TABLES_LARAVEL } from '@/constants.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readSqlFile = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, `../${filename}`), 'utf8');
};

export const introspect = async (
  dbConnection: string,
  dbType: DBTypes,
): Promise<unknown> => {
  if (!dbConnection) {
    throw new Error('Database connection string is required');
  }

  const { dbName } = extractDBConnectionInfo(dbConnection);

  const query = readSqlFile(`introspect_${dbType}.sql`);
  let result: unknown;

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
    (table: { table_name: string }) => {
      return !IGNORED_TABLES_LARAVEL.includes(table.table_name);
    },
  );

  return filteredResult;
};

export default introspect;
