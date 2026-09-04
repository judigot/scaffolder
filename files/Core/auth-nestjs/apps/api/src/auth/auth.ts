import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export interface INestAuthTables {
  user: unknown;
  session: unknown;
  account?: unknown;
  verification?: unknown;
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

function resolveTrustedOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS;
  if (!configured) {
    return ['http://localhost:3001', 'http://localhost:3002'];
  }

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function createNestAuth(db: unknown, tables: INestAuthTables) {
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

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
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
      expiresIn: 60 * 60 * 24 * 30,
      fields: {
        token: 'id',
      },
    },
    advanced: {
      cookies: {
        session_token: {
          name: 'auth_session',
        },
      },
    },
  });
}
