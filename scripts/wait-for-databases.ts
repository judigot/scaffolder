import Pool from 'pg-pool';
import { createConnection } from 'mysql2/promise';

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`${key} is not set`);
  }
  return value;
};

const buildPostgresUrl = (): string => {
  const database = getEnv('DB_DATABASE', 'scaffolder');
  const username = getEnv('DB_USERNAME', 'scaffolder');
  const password = getEnv('DB_PASSWORD', 'scaffolder123');
  const port = getEnv('POSTGRESQL_PORT', '15432');
  return `postgresql://${username}:${password}@localhost:${port}/${database}`;
};

const buildMySQLUrl = (): string => {
  const database = getEnv('DB_DATABASE', 'scaffolder');
  const password = getEnv('DB_PASSWORD', 'scaffolder123');
  const port = getEnv('MYSQL_PORT', '13306');
  return `mysql://root:${password}@localhost:${port}/${database}`;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForPostgres = async (connectionString: string): Promise<void> => {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  client.release();
  await pool.end();
};

const waitForMySQL = async (connectionString: string): Promise<void> => {
  const connection = await createConnection(connectionString);
  await connection.end();
};

const waitFor = async (
  label: string,
  checker: () => Promise<void>,
  timeoutMs: number,
  intervalMs: number,
): Promise<void> => {
  const start = Date.now();
  let lastErrorMessage = 'unknown error';

  while (Date.now() - start < timeoutMs) {
    try {
      await checker();
      return;
    } catch (error) {
      lastErrorMessage =
        error instanceof Error ? error.message : 'unknown error';
    }
    console.log(`Waiting for ${label}...`);
    await sleep(intervalMs);
  }

  throw new Error(`${label} did not become ready: ${lastErrorMessage}`);
};

const main = async (): Promise<void> => {
  const postgresUrl = buildPostgresUrl();
  const mysqlUrl = buildMySQLUrl();

  await waitFor('postgres', () => waitForPostgres(postgresUrl), 60000, 1000);
  await waitFor('mysql', () => waitForMySQL(mysqlUrl), 60000, 1000);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
