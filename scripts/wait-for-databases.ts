import { Client } from 'pg';
import { createConnection } from 'mysql2/promise';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    throw new Error(`${key} is not set`);
  }
  return value;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForPostgres = async (connectionString: string): Promise<void> => {
  const client = new Client({ connectionString });
  await client.connect();
  await client.end();
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
  const postgresUrl = getEnv('POSTGRES_TEST_URL');
  const mysqlUrl = getEnv('MYSQL_TEST_URL');

  await waitFor('postgres', () => waitForPostgres(postgresUrl), 60000, 1000);
  await waitFor('mysql', () => waitForMySQL(mysqlUrl), 60000, 1000);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
