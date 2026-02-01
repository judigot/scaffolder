import { Lucia, TimeSpan } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import type { User } from './types';

// This will be initialized with the actual db and tables from the app
let luciaInstance: Lucia<Record<never, never>, DatabaseUserAttributes> | null = null;

interface DatabaseUserAttributes {
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
}

declare module 'lucia' {
  interface Register {
    Lucia: typeof luciaInstance;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

export function initializeLucia(
  db: Parameters<typeof DrizzlePostgreSQLAdapter>[0],
  sessionTable: Parameters<typeof DrizzlePostgreSQLAdapter>[1],
  userTable: Parameters<typeof DrizzlePostgreSQLAdapter>[2],
) {
  const adapter = new DrizzlePostgreSQLAdapter(db, sessionTable, userTable);

  luciaInstance = new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(30, 'd'),
    sessionCookie: {
      name: 'auth_session',
      expires: false, // Session cookies for browser close
      attributes: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    },
    getUserAttributes: (attributes) => ({
      email: attributes.email,
      username: attributes.username,
      firstName: attributes.firstName,
      lastName: attributes.lastName,
      avatarUrl: attributes.avatarUrl,
      emailVerified: attributes.emailVerified,
    }),
  });

  return luciaInstance;
}

export function getLucia() {
  if (!luciaInstance) {
    throw new Error('Lucia not initialized. Call initializeLucia first.');
  }
  return luciaInstance;
}

export { Lucia };
