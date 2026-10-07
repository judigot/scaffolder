import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';
import * as schema from '../db/schema.ts';
import { type IAuthConfig, loadAuthConfig } from './config.ts';

export function createAuth(
  database: ReturnType<typeof drizzleAdapter>,
  config: IAuthConfig,
) {
  return betterAuth({
    database,
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: '/api/auth',
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    advanced: { database: { generateId: 'uuid' } },
    rateLimit: { enabled: true, storage: 'database' },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (auth !== undefined) {
    return auth;
  }
  const config = loadAuthConfig(process.env);
  const connectionString = z.url().parse(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString, max: 5 });
  auth = createAuth(
    drizzleAdapter(drizzle(pool, { schema }), { provider: 'pg', schema }),
    config,
  );
  return auth;
}
