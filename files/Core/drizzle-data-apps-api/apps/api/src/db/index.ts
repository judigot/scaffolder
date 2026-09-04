import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

let queryClient: ReturnType<typeof postgres> | undefined;
let database: Database | undefined;

function requireDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.trim() === '') {
    throw new Error('DATABASE_URL is required for database access');
  }
  return connectionString;
}

export function getDb(): Database {
  if (database !== undefined) {
    return database;
  }

  const connectionString = requireDatabaseUrl();
  queryClient = postgres(connectionString);
  database = drizzle(queryClient, { schema });
  return database;
}

export function getMigrationClient(): ReturnType<typeof postgres> {
  return postgres(requireDatabaseUrl(), { max: 1 });
}

/*
 * Lazy proxy so Nest can boot health/hello without DATABASE_URL. The first
 * query (or getDb()) opens the connection.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, property, receiver) as unknown;
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
