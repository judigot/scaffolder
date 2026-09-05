import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export interface IBetterAuthTables {
  db: unknown;
  user: unknown;
  session: unknown;
  account?: unknown;
  verification?: unknown;
}

export type IBetterAuth = ReturnType<typeof createBetterAuth>;

let authInstance: IBetterAuth | null = null;

const SESSION_COOKIE_NAME = 'auth_session';
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

function resolveTrustedOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS;
  if (!configured) {
    return ['http://localhost:3000', 'http://localhost:5173'];
  }

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function resolveSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'BETTER_AUTH_SECRET must be set to at least 32 characters in production.',
    );
  }

  return 'development-only-better-auth-secret-key';
}

function buildSchema(tables: IBetterAuthTables): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    user: tables.user,
    session: tables.session,
  };

  if (tables.account) {
    schema.account = tables.account;
  }

  if (tables.verification) {
    schema.verification = tables.verification;
  }

  return schema;
}

/**
 * Better Auth instance mapped onto generated Drizzle user/session tables.
 * Session tokens are stored in `session.id` so Lucia-shaped schemas keep working.
 */
export function createBetterAuth(tables: IBetterAuthTables) {
  return betterAuth({
    database: drizzleAdapter(tables.db, {
      provider: 'pg',
      schema: buildSchema(tables),
    }),
    secret: resolveSecret(),
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    basePath: '/api/auth',
    trustedOrigins: resolveTrustedOrigins(),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      fields: {
        name: 'username',
      },
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      fields: {
        token: 'id',
      },
    },
    advanced: {
      database: {
        generateId: (options) => {
          if (options.model === 'user') {
            return crypto.randomUUID();
          }

          return generateIdFromEntropySize(32);
        },
      },
      cookies: {
        session_token: {
          name: SESSION_COOKIE_NAME,
        },
      },
    },
  });
}

export function initializeBetterAuth(
  db: IBetterAuthTables['db'],
  sessionTable: IBetterAuthTables['session'],
  userTable: IBetterAuthTables['user'],
  extraTables?: Pick<IBetterAuthTables, 'account' | 'verification'>,
): IBetterAuth {
  authInstance = createBetterAuth({
    db,
    session: sessionTable,
    user: userTable,
    account: extraTables?.account,
    verification: extraTables?.verification,
  });

  return authInstance;
}

export function getBetterAuth(): IBetterAuth {
  if (!authInstance) {
    throw new Error(
      'Better Auth is not initialized. Call initializeBetterAuth first.',
    );
  }

  return authInstance;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

/**
 * Hex id helper used by generated string primary keys.
 * UUID tables should call `crypto.randomUUID()` instead.
 */
export function generateIdFromEntropySize(size: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let output = '';
  for (const byte of bytes) {
    output += byte.toString(16).padStart(2, '0');
  }
  return output;
}

export { SESSION_COOKIE_NAME };
