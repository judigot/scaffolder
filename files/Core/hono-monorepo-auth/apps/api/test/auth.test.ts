import { afterAll, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { createApp } from '../src/app.ts';
import { loadAuthConfig } from '../src/auth/config.ts';
import { createAuth } from '../src/auth/index.ts';
import * as schema from '../src/db/schema.ts';

const client = new PGlite();
const db = drizzle(client, { schema });
await migrate(db, {
  migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
});
const auth = createAuth(drizzleAdapter(db, { provider: 'pg', schema }), {
  secret: 'test-only-authentication-secret-not-for-production',
  baseURL: 'http://localhost:3000',
  trustedOrigins: ['http://localhost:3000'],
});
const app = createApp(() => auth);
afterAll(async () => {
  await client.close();
});

let requestNumber = 0;

function request(
  path: string,
  body?: Record<string, string>,
  cookie?: string,
  origin = 'http://localhost:3000',
) {
  requestNumber += 1;
  const headers = new Headers({
    Origin: origin,
    'X-Forwarded-For': `192.0.2.${String(requestNumber)}`,
  });
  if (cookie !== undefined) {
    headers.set('Cookie', cookie);
  }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  return app.request(`http://localhost:3000/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function sessionCookie(response: Response): string {
  const cookie = response.headers.get('set-cookie');
  if (cookie === null) {
    throw new Error('Authentication response must set a session cookie');
  }
  return cookie.split(';')[0] ?? '';
}

describe('real database authentication', () => {
  test('rate limits repeated login attempts with persisted counters', async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.request(
        'http://localhost:3000/api/auth/sign-in/email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'http://localhost:3000',
            'X-Forwarded-For': '198.51.100.1',
          },
          body: JSON.stringify({
            email: 'unknown@example.com',
            password: 'incorrect-password-value',
          }),
        },
      );
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
    expect((await db.select().from(schema.rateLimit)).length).toBeGreaterThan(
      0,
    );
  });

  test('rejects anonymous identity access and exposes no identity CRUD', async () => {
    expect((await request('/me')).status).toBe(401);
    for (const path of ['/user', '/session', '/account', '/verification']) {
      expect((await request(path)).status).toBe(404);
      expect(
        (await request(path, { userId: crypto.randomUUID() })).status,
      ).toBe(404);
    }
  });

  test('signup, credential hashing, login, session lookup and logout', async () => {
    const password = 'correct-horse-battery-staple';
    const signup = await request('/auth/sign-up/email', {
      name: 'Example User',
      email: 'user@example.com',
      password,
    });
    expect(signup.status).toBe(200);
    const body = await signup.text();
    expect(body).not.toContain(password);
    expect(body).not.toContain('hashedPassword');
    const cookie = sessionCookie(signup);
    expect(cookie).toContain('session_token');
    const [user] = await db.select().from(schema.user);
    expect(user?.id).toMatch(/^[0-9a-f-]{36}$/);
    const [account] = await db.select().from(schema.account);
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toBe(password);
    expect((await request('/me', undefined, cookie)).status).toBe(200);
    const wrong = await request('/auth/sign-in/email', {
      email: 'user@example.com',
      password: 'wrong-password-value',
    });
    expect(wrong.status).toBe(401);
    const login = await request('/auth/sign-in/email', {
      email: 'user@example.com',
      password,
    });
    expect(login.status).toBe(200);
    const loginCookie = sessionCookie(login);
    expect(
      (await request('/auth/get-session', undefined, loginCookie)).status,
    ).toBe(200);
    expect((await request('/auth/sign-out', {}, loginCookie)).status).toBe(200);
    expect((await request('/me', undefined, loginCookie)).status).toBe(401);
  });

  test('rejects invalid email, short passwords and untrusted origins', async () => {
    expect(
      (
        await request('/auth/sign-up/email', {
          name: 'User',
          email: 'not-email',
          password: 'long-enough-password',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request('/auth/sign-up/email', {
          name: 'User',
          email: 'short@example.com',
          password: 'short',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          '/auth/sign-up/email',
          {
            name: 'User',
            email: 'evil@example.com',
            password: 'long-enough-password',
          },
          undefined,
          'https://untrusted.example',
        )
      ).status,
    ).toBe(403);
  });

  test('expired sessions cannot authenticate', async () => {
    const signup = await request('/auth/sign-up/email', {
      name: 'Expiry',
      email: 'expiry@example.com',
      password: 'long-enough-password',
    });
    expect(signup.status).toBe(200);
    const cookie = sessionCookie(signup);
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, 'expiry@example.com'));
    if (user === undefined) {
      throw new Error('Expected signup to persist user');
    }
    await db
      .update(schema.session)
      .set({ expiresAt: new Date(0) })
      .where(eq(schema.session.userId, user.id));
    expect((await request('/me', undefined, cookie)).status).toBe(401);
  });

  test('deleting a user cascades sessions and credential accounts', async () => {
    const signup = await request('/auth/sign-up/email', {
      name: 'Delete',
      email: 'delete@example.com',
      password: 'long-enough-password',
    });
    expect(signup.status).toBe(200);
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, 'delete@example.com'));
    if (user === undefined) {
      throw new Error('Expected signup to persist user');
    }
    await db.delete(schema.user).where(eq(schema.user.id, user.id));
    expect(
      await db
        .select()
        .from(schema.session)
        .where(eq(schema.session.userId, user.id)),
    ).toEqual([]);
    expect(
      await db
        .select()
        .from(schema.account)
        .where(eq(schema.account.userId, user.id)),
    ).toEqual([]);
  });
});

describe('authentication environment', () => {
  test('fails closed without a strong secret or with an insecure production origin', () => {
    expect(() =>
      loadAuthConfig({ BETTER_AUTH_URL: 'http://localhost:3000' }),
    ).toThrow();
    expect(() =>
      loadAuthConfig({
        BETTER_AUTH_SECRET: 'short',
        BETTER_AUTH_URL: 'http://localhost:3000',
      }),
    ).toThrow();
    expect(() =>
      loadAuthConfig({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'a'.repeat(32),
        BETTER_AUTH_URL: 'http://example.com',
      }),
    ).toThrow();
    expect(() =>
      loadAuthConfig({
        BETTER_AUTH_SECRET: 'a'.repeat(32),
        BETTER_AUTH_URL: 'https://example.com',
        CORS_ORIGINS: '*',
      }),
    ).toThrow();
  });
});
