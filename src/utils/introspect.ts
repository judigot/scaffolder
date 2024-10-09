import fs from 'fs';
import path from 'path';
import { executePostgreSQL, executeMySQL } from '..';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo';

const platform: string = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const readSqlFile = (filename: string): string => {
  return fs.readFileSync(path.join(__dirname, `../${filename}`), 'utf8');
};

const ignoredTables_laravel: string[] = [
  "migrations",
  "failed_jobs",
  "password_resets",
  "password_reset_tokens",
  "cache_locks",
  "personal_access_tokens",
  "cache",
  "jobs",
  "job_batches",
  "sessions",
  "oauth_access_tokens",
  "oauth_auth_codes",
  "oauth_clients",
  "oauth_personal_access_clients",
  "oauth_refresh_tokens",
  "telescope_entries",
  "telescope_entries_tags",
  "telescope_monitoring",
  "horizon_jobs",
  "horizon_monitoring",
  "horizon_supervisor_commands",
  "horizon_tags"
];

export const introspect = async (dbConnection: string): Promise<unknown> => {
  if (!dbConnection) {
    throw new Error('Database connection string is required');
  }

  const { dbType, dbName } = extractDBConnectionInfo(dbConnection);

  const query = readSqlFile(`introspect_${String(dbType)}.sql`);
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
  const filteredResult = (Array.isArray(result) ? result : []).filter((table: { table_name: string }) => {
    return !ignoredTables_laravel.includes(table.table_name);
  });

  return filteredResult;
};

export default introspect;
